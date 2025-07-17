import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'wiltec',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  ssl: false,
  keepAlive: true
});

// Log all pool events for debugging
pool.on('connect', (client) => {
  console.log('New client connected');
  const schema = process.env.PG_SCHEMA || 'public';
  client.query(`SET search_path TO ${schema}`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('acquire', () => {
  console.log('Client acquired from pool');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Set search_path after connection
pool.on('connect', (client) => {
  const schema = process.env.PG_SCHEMA || 'public';
  client.query(`SET search_path TO ${schema}`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Generic query endpoint
app.post('/api/query', async (req, res) => {
  const { table, operation, columns, data, where, orderBy, limit } = req.body;
  const client = await pool.connect();

  try {
    let query = '';
    let params: any[] = [];
    let paramCount = 1;

    switch (operation) {
      case 'select':
        query = `SELECT ${columns || '*'} FROM ${table}`;
        if (where) {
          const whereClause = Object.entries(where)
            .map(([key]) => `${key} = $${paramCount++}`)
            .join(' AND ');
          query += ` WHERE ${whereClause}`;
          params = Object.values(where);
        }
        if (orderBy) {
          query += ` ORDER BY ${orderBy.column} ${orderBy.ascending ? 'ASC' : 'DESC'}`;
        }
        if (limit) {
          query += ` LIMIT ${limit}`;
        }
        break;

      case 'insert':
        const insertColumns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data)
          .map(() => `$${paramCount++}`)
          .join(', ');
        query = `INSERT INTO ${table} (${insertColumns}) VALUES (${placeholders}) RETURNING *`;
        params = Object.values(data);
        break;

      case 'update':
        const setClause = Object.keys(data)
          .map(key => `${key} = $${paramCount++}`)
          .join(', ');
        const whereClause = Object.keys(where)
          .map(key => `${key} = $${paramCount++}`)
          .join(' AND ');
        query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
        params = [...Object.values(data), ...Object.values(where)];
        break;

      case 'delete':
        const deleteWhereClause = Object.keys(where)
          .map(key => `${key} = $${paramCount++}`)
          .join(' AND ');
        query = `DELETE FROM ${table} WHERE ${deleteWhereClause} RETURNING *`;
        params = Object.values(where);
        break;

      default:
        throw new Error('Invalid operation');
    }

    console.log('Executing query:', query, 'with params:', params);

    const result = await client.query(query, params);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      data: null,
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test connection endpoint
app.get('/api/test-connection', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT NOW()');
    res.json({ 
      status: 'connected', 
      data: result.rows,
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
  console.log('PostgreSQL configuration:', {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || '5432',
    database: process.env.PG_DATABASE || 'wiltec',
    user: process.env.PG_USER || 'postgres',
    schema: process.env.PG_SCHEMA || 'public'
  });
});