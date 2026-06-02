// frontend/src/app/api/rpc/route.js
import { NextResponse } from "next/server";

const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network",
];

let activeRpcIndex = 0;

// Simple in-memory cache for read-only JSON-RPC calls (e.g. eth_call, eth_blockNumber)
const cache = new Map();
const CACHE_TTL = 3000; // 3 seconds TTL is perfect for multi-hook batching without staling

// Periodically clean up expired cache entries
if (typeof global._rpcCacheCleanupInterval === "undefined") {
  global._rpcCacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
  }, 15000);
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Check if the request is read-only and cacheable
    const isReadOnly = body.method === "eth_call" || body.method === "eth_blockNumber";
    const cacheKey = JSON.stringify(body);
    
    if (isReadOnly && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }
    
    // Try sending the request with fallback RPC endpoints on server side (No CORS limits)
    let lastError;
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const endpointIndex = (activeRpcIndex + i) % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[endpointIndex];
      
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000) // 5s timeout to switch quickly on dead nodes
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        // If we switched from the default and it succeeded, persist the new active index
        if (i > 0) {
          activeRpcIndex = endpointIndex;
          console.log(`Server-side RPC fallback switched to: ${endpoint}`);
        }
        
        // Cache successful read-only results
        if (isReadOnly && data && !data.error) {
          cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }
        
        return NextResponse.json(data);
      } catch (err) {
        console.warn(`Server-side RPC failed for ${endpoint}:`, err.message);
        lastError = err;
      }
    }
    
    // If all fail, return JSON-RPC compliant error
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id || null,
      error: {
        code: -32000,
        message: `All server-side RPC endpoints failed. Last error: ${lastError?.message}`
      }
    }, { status: 502 });
    
  } catch (err) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: `RPC Proxy Error: ${err.message}`
      }
    }, { status: 400 });
  }
}
