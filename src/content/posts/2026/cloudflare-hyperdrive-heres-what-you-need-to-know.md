---
author: K Manoj Kumar
pubDatetime: 2026-01-28T08:32:13.000Z
modDatetime: 2026-01-28T08:32:13.000Z
title: "Cloudflare Hyperdrive: Here's What You Need to Know"
slug: cloudflare-hyperdrive-heres-what-you-need-to-know
featured: false
draft: false
topics:
  - devops
ogImage: "../../../assets/images/posts/cloudflare-hyperdrive-heres-what-you-need-to-know-cover.png"
description: "Cloudflare Hyperdrive turns a slow Postgres connection into something Workers can actually use. What it solves, when to use it, and where it bites."
---

I've been tinkering with Cloudflare products for a while now. Workers, Pages, D1, KV - they all have their place in the stack. But Hyperdrive? This one's different. It's the piece I've been waiting for because it actually solves a real problem that most developers don't talk about until it bites them.

Here's the thing - you've got a database somewhere. Maybe it's AWS RDS, Neon, Supabase, or PlanetScale. Maybe it's an old Postgres instance running on AWS us-east-1. And you want to build a fast, global application using Cloudflare Workers. But every query to your database is taking forever because it's on the other side of the world.

I spent the last few days building with Hyperdrive, and I'm gonna walk you through what it actually does, how it works, why it matters, and where it fits in your architecture.

### What Hyperdrive Actually Is

[Hyperdrive](https://developers.cloudflare.com/hyperdrive/?ref=kmanojkumar.com) isn't a database. It's not a replacement for your database. **It's a connection pool that sits between your Workers and your existing database, distributed globally across Cloudflare's network.**

Think of it like this: instead of your Worker in London trying to connect to a database in New York every single time, Hyperdrive keeps a pool of connections already open in data centers close to your database. When your Worker needs to query data, it borrows a connection from the nearest pool, runs the query, and gives it back.

That's it. Simple concept. But the performance difference is massive.

## The Pain This Solves

Before I explain how Hyperdrive works technically, let me explain why you'd want it.

When your Worker connects directly to a remote database, it has to do this:

1.  TCP handshake (1 round-trip)
2.  TLS negotiation (3 round-trips)
3.  Database authentication (3 round-trips)

That's 7 round-trips before you even send a query. With each round-trip taking 100-200ms depending on geography, you're looking at 700-1400ms just to set up a connection. Then add another 100-200ms for the actual query. Your response time is already in the red zone and the user hasn't even seen anything yet.

**With Hyperdrive?** All those round-trips happen once when the pool is initialized, and then connections are reused. Your Worker talks to Hyperdrive on the same Cloudflare server it's running on, sends the query, and gets a response.

The benchmark they ran internally showed a direct database query taking 1200ms, but through Hyperdrive it's 500ms - a 60% reduction just from connection pooling. With query caching enabled, that drops to 320ms. **That's 75% faster.** I ran my own quick test and got similar numbers. The difference is night and day.

## How Hyperdrive Actually Works

Here's where it gets interesting. Hyperdrive has 3 core components working together.

**1\. Connection Pooling at Scale**

Hyperdrive maintains a pool of database connections that are placed in data centers as close to your origin database as possible. This is intentional - they actually measure which Cloudflare locations have the fastest connection times to your database and place the connection pool there.

When you create a Hyperdrive configuration, you set a max_size parameter which tells Hyperdrive how many connections it's allowed to maintain. **For free tier it's around 20 connections, for paid it's around 100.** This is a soft limit - Hyperdrive will temporarily exceed it during traffic spikes to ensure high availability.

The **pooler operates in transaction mode**. When your Worker sends a query, it gets assigned a connection. That connection stays with your Worker for the duration of the transaction, then gets returned to the pool when the transaction finishes. The next query might get a different connection from the pool, which is fine - the pool ensures all connections are in a consistent, idle state.

**2\. Smart Query Caching**

This is where Hyperdrive gets clever. It understands SQL at the protocol level. It can differentiate between a SELECT query (read-only, safe to cache) and an INSERT, UPDATE, or DELETE (mutating, should never be cached).

By default, **Hyperdrive caches all read queries for 60 seconds. You can configure this up to 1 hour**. It also supports **stale_while_revalidate** which means it can continue serving cached results for an additional 15 seconds while it's fetching fresh data in the background.

But here's the kicker - this caching happens across all Cloudflare locations. If a query was cached in Frankfurt, and someone in Tokyo runs the same query, they get the cached result from the nearest edge location. This was a recent improvement and it cuts latency by up to 90% for cache hits.

About 70-80% of queries in a typical web application are reads that can be cached. That means most of your queries are served from cache without ever touching your origin database.

**3\. Latency Reduction Through Placement**

This is the unsexy but super important part. Hyperdrive collects latency data from all its edge locations to your database. It then deterministically selects the best data centers - the ones that can connect to your database fastest - and only runs the connection pool in those locations.

Recently, they improved this further. They moved connection pool placement even closer to origin databases. The result? Uncached query latency dropped by up to 90%. **That means even when you can't use cache, you're still getting a massive speedup.**

Combined with [Workers' Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/?ref=kmanojkumar.com) (which runs your code closest to where it's needed), the whole system starts to feel like your database is global even though it's in one region.

## Database Support and Drivers

Hyperdrive supports PostgreSQL and MySQL, which covers most use cases. But more importantly, [it works with almost any database provider](https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/?ref=kmanojkumar.com) you can think of.

- AWS Aurora (both Postgres and MySQL)
- Neon (Postgres)
- Supabase (Postgres)
- PlanetScale (MySQL)

It also supports Postgres-compatible databases like CockroachDB and Timescale. The versions it supports are pretty broad - PostgreSQL 9.0 to 17.x, and MySQL 5.7 to 8.x.

MongoDB and SQL Server are currently not supported.

For drivers, you've got solid options:

- **node-postgres (pg)** - Recommended. Solid, well-maintained, works great with Hyperdrive.
- **Postgres.js** - Modern, minimalist, handles connection pooling well.
- **mysql2** - For MySQL. Fast, supports promises.
- **Prisma, Drizzle, Sequelize** - All the major ORMs work because they use these base drivers under the hood.

The important part is that you don't need to rewrite your code. You just change your connection string to use Hyperdrive and you're done. Your existing ORM or driver just works.

## Setting Up Hyperdrive

Setting up is straightforward. Create Hyperdrive configuration via the Cloudflare dashboard:

```
wrangler hyperdrive create my-database --connection-string postgresql://user:password@host:5432/dbname

```

Then bind it to Worker in wrangler.toml:

```
[[hyperdrive]]
binding = "DB"
id = "xxxxx"
```

Then in Worker code, create a client:

```
import { Client } from 'pg'

export default {
  async fetch(req, env) {
    const client = new Client({
      connectionString: env.DB.connectionString
    })

    const result = await client.query('SELECT * FROM users WHERE id = $1', [123])
    await client.end()

    return new Response(JSON.stringify(result.rows))
  }
}
```

That's it! **Just one line change and you're routing through Hyperdrive**.

For local development, you can either connect to your local database directly (set localConnectionString in your config) or connect to your remote database for more accurate testing.

## Connecting Private Databases

What if your database isn't publicly accessible? It's in a VPC behind corporate firewalls. Hyperdrive handles this too, using a secure connection from your network to Cloudflare.

**You set up a Cloudflare Tunnel in your private network.** This creates an outbound connection from your network to Cloudflare. Then you configure Hyperdrive to connect through that tunnel.

Hyperdrive automatically creates the Cloudflare Access application and service tokens needed to secure this. You just specify the tunnel and Hyperdrive handles the rest. It's like someone finally made this pattern easy.

The connection flow is: Worker → Hyperdrive → Cloudflare Access → Cloudflare Tunnel → Your Private Database.

It's secure, isolated, and actually simple to set up.

## Pricing and Limits

Hyperdrive is bundled with Workers pricing. It's included in both free and paid plans.

**Free Plan:**

- 100,000 database queries per day
- Max 10 configured databases per account
- ~20 max connections per configuration

**Paid Plan:**

- Unlimited queries
- 25 configured databases per account
- ~100 max connections per configuration

Both plans get connection pooling and query caching - no additional charges.

The free plan is generous, and you can build a real product on it. The paid plan is where you scale.

A few important limits to know:

- Maximum query duration: 60 seconds (both plans)
- Maximum cached response size: 50 MB
- Idle connection timeout: 10 minutes
- Initial connection timeout: 15 seconds

These are reasonable. I've never hit them in normal use. If your query takes more than 60 seconds, that's probably a problem with your query anyway.

## When Hyperdrive Makes Sense (And When It Doesn't)

I've been thinking about where Hyperdrive actually fits in different architectures.

**Hyperdrive is great for:**

- Building global apps on Workers that need to query a centralized database
- APIs that do a lot of read queries (where caching helps)
- Applications where latency to the database is a bottleneck
- Teams that want serverless compute without sacrificing database connectivity
- Situations where you're currently using slow database proxies or connection pools

**Hyperdrive is less useful for:**

- Applications that are write-heavy and can't use caching
- Databases that need to be in multiple regions (use database replication instead)
- Applications that need sub-ms latency (still global, might not be enough)
- Long-running transactions that keep connections open

## The Real-World Performance Impact

Let me be concrete about what this means for your application.

A typical web request that queries a remote database:

- **Without Hyperdrive:** 1200-1500ms (mostly connection overhead)
- **With Hyperdrive (no cache):** 500ms (connection pooling saves 60%)
- **With Hyperdrive (cached):** 320ms (you save 75%)

If your application makes 3 database queries per request (common for web apps), that's:

- **Without Hyperdrive:** 3600-4500ms
- **With Hyperdrive (mixed cache):** 1200ms

**That's 3x faster. Your LCP improves. Your Core Web Vitals improve. User experience improves.**

Plus, by reducing load on your origin database through connection pooling and caching, you might not need to scale your database as aggressively. That's a real cost saving.

## My Takes

**What I like:**

- It actually works. The latency improvements are real and measurable.
- Setup is simple. No refactoring required.
- It works with existing drivers and ORMs. You don't need to learn new abstractions.
- The caching is smart - it understands SQL at the protocol level.
- Private database support via Tunnel is clean and secure.
- It solves a real problem that wasn't solved before.

**What I'd like to see:**

- Better observability out of the box. I want to see cache hit rates, connection pool utilization, and query latencies without third-party tools.
- More granular cache control per-query. Sometimes I want certain queries to never cache, and setting this at the Hyperdrive level will be useful.
- Connection pool metrics in the dashboard. Tell me how many connections are open, how many are idle, and when we're hitting the soft limits.
- Automatic retry logic for transient failures would be nice.

Hyperdrive is a solid, production-ready service. If you're building on Workers and need to talk to a SQL database, you must try Hyperdrive.

## Real Use Cases

**Cloudflare itself uses Hyperdrive internally** - their billing system, D1 control plane, and Workers KV all use it to connect to Postgres clusters. If it's good enough for Cloudflare's own infrastructure, it's probably good enough for yours.

I've seen it used for:

- Content management systems serving global sites
- E-commerce platforms reading product catalogs
- Analytics dashboards querying historical data
- Admin interfaces for SaaS products
- Real-time APIs with read-heavy workloads

## What's Next

Hyperdrive fits perfectly into the modern serverless stack. You've got:

- Workers for compute (global, stateless, instant scale)
- Hyperdrive for database access (global connection pooling)
- D1 for local/edge data (SQLite at the edge)
- Durable Objects for coordination (if you need it)

This stack lets you build genuinely global applications without the complexity of managing databases across regions or dealing with replication lag.

The bottleneck in serverless has always been "how do I efficiently access my database from everywhere?" - Hyperdrive finally makes it practical!

_Follow_ [_Cloudflare docs_](https://developers.cloudflare.com/hyperdrive/get-started/?ref=kmanojkumar.com) _to get started!_
