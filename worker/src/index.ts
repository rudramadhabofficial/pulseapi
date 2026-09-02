import { Client } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

const CHECK_INTERVAL_MS = 60000; // 1 minute

async function runChecks() {
  console.log(`[${new Date().toISOString()}] Starting health checks...`);
  try {
    const res = await client.query('SELECT id, url, method, "expectedStatus", "timeoutMs", status FROM "Endpoint"');
    const endpoints = res.rows;

    for (const ep of endpoints) {
      await checkEndpoint(ep);
    }
  } catch (error) {
    console.error("Error fetching endpoints:", error);
  }
}

async function checkEndpoint(ep: any) {
  const startTime = Date.now();
  let success = false;
  let statusCode = null;

  try {
    const response = await axios({
      method: ep.method,
      url: ep.url,
      timeout: ep.timeoutMs,
      validateStatus: () => true, // resolve on any status
    });
    
    statusCode = response.status;
    success = response.status === ep.expectedStatus;
  } catch (error: any) {
    success = false;
  }

  const responseTimeMs = Date.now() - startTime;

  // Insert health check
  const hcId = crypto.randomUUID();
  await client.query(
    'INSERT INTO "HealthCheck" (id, "endpointId", "statusCode", "responseTimeMs", success, "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())',
    [hcId, ep.id, statusCode, responseTimeMs, success]
  );

  // Check recent history for incident evaluation
  const historyRes = await client.query(
    'SELECT success FROM "HealthCheck" WHERE "endpointId" = $1 ORDER BY "createdAt" DESC LIMIT 3',
    [ep.id]
  );
  
  const history = historyRes.rows.map(r => r.success);
  
  if (!success && history.length === 3 && history.every(h => !h) && ep.status !== 'DOWN') {
    // Trigger incident
    await client.query('UPDATE "Endpoint" SET status = $1 WHERE id = $2', ['DOWN', ep.id]);
    const incId = crypto.randomUUID();
    await client.query(
      'INSERT INTO "Incident" (id, "endpointId", status, "startedAt") VALUES ($1, $2, $3, NOW())',
      [incId, ep.id, 'OPEN']
    );
    console.log(`🚨 Incident triggered for endpoint ${ep.id}`);
  } else if (success && ep.status === 'DOWN') {
    // Resolve incident
    await client.query('UPDATE "Endpoint" SET status = $1 WHERE id = $2', ['HEALTHY', ep.id]);
    await client.query(
      'UPDATE "Incident" SET status = $1, "resolvedAt" = NOW() WHERE "endpointId" = $2 AND status = $3',
      ['RESOLVED', ep.id, 'OPEN']
    );
    console.log(`✅ Incident resolved for endpoint ${ep.id}`);
  }
}

async function start() {
  await client.connect();
  console.log("Worker connected to database");
  
  runChecks();
  setInterval(runChecks, CHECK_INTERVAL_MS);
}

start().catch(console.error);
