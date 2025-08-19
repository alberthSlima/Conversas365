"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

type ConversationUpdatedPayload = { id?: number | string; state?: string; json?: unknown };

type HubAPI = {
  state: signalR.HubConnectionState | 'none';
  joinConversation: (id: number | string) => Promise<void>;
  leaveConversation: (id: number | string) => Promise<void>;
  joinPhone: (phone: string) => Promise<void>;
  leavePhone: (phone: string) => Promise<void>;
  onConversationUpdated: (handler: (p: ConversationUpdatedPayload) => void) => () => void;
  onConversationCreated: (handler: (p: unknown) => void) => () => void;
};

const HubContext = createContext<HubAPI | null>(null);

export function HubProvider({ children }: { children: React.ReactNode }) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const [state, setState] = useState<signalR.HubConnectionState | 'none'>('none')

  const convCountsRef = useRef<Map<string, number>>(new Map())
  const phoneCountsRef = useRef<Map<string, number>>(new Map())
  const onUpdatedSubs = useRef<Set<(p: ConversationUpdatedPayload) => void>>(new Set())
  const onCreatedSubs = useRef<Set<(p: unknown) => void>>(new Set())
  const hubUrlRef = useRef<string>('')

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectCountRef = useRef<number>(0)
  const joinCountsRef = useRef<{ conv: number; phone: number }>({ conv: 0, phone: 0 })

  const eventHistoryRef = useRef<Array<{ time: number; type: 'updated' | 'created' | 'heartbeat' | 'reconnect' }>>([])

  const HEARTBEAT_INTERVAL = 15000
  const ENABLE_HUB_LOGS = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HUB_LOGS === 'true'

  // ---------------- Logs ----------------
  const log = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    if (!ENABLE_HUB_LOGS) return
    const timestamp = new Date().toISOString()
    const style = type === 'info' ? 'color:green' : type === 'warn' ? 'color:orange' : 'color:red'
    console.log(`%c[${timestamp}] [SignalR] ${msg}`, style)
  }, [ENABLE_HUB_LOGS])

  const logDashboard = useCallback(() => {
    if (!ENABLE_HUB_LOGS) return
    console.log('%c[Dashboard]', 'color:cyan; font-weight:bold', {
      state,
      reconnects: reconnectCountRef.current,
      joins: { ...joinCountsRef.current },
      convGroups: Array.from(convCountsRef.current.entries()),
      phoneGroups: Array.from(phoneCountsRef.current.entries())
    })
  }, [state, ENABLE_HUB_LOGS])

  // ---------------- Mini monitor visual ----------------
  const logEventVisual = useCallback((type: 'updated' | 'created' | 'heartbeat' | 'reconnect') => {
    if (!ENABLE_HUB_LOGS) return
    const now = Date.now()
    eventHistoryRef.current.push({ time: now, type })

    if (eventHistoryRef.current.length > 30) eventHistoryRef.current.shift()

    const chart = eventHistoryRef.current.map(e => {
      switch (e.type) {
        case 'updated': return '%c💬'
        case 'created': return '%c🆕'
        case 'heartbeat': return '%c💓'
        case 'reconnect': return '%c🔄'
      }
    })

    const styles = eventHistoryRef.current.map(e => {
      switch (e.type) {
        case 'updated': return 'color: green; font-weight:bold'
        case 'created': return 'color: blue; font-weight:bold'
        case 'heartbeat': return 'color: orange; font-weight:bold'
        case 'reconnect': return 'color: red; font-weight:bold'
      }
    })

    console.log(chart.join(' '), ...styles)
  }, [ENABLE_HUB_LOGS])

  // ---------------- Safe invoke ----------------
  const safeInvoke = useCallback(async (method: string, ...args: unknown[]) => {
    const conn = connectionRef.current
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      log(`Cannot invoke ${method}, connection not ready`, 'warn')
      return
    }
    try {
      await conn.invoke(method, ...(args as unknown[]))
      log(`Invoke success: ${method}`)
    } catch (err) {
      log(`Invoke failed: ${method}: ${err}`, 'error')
    }
  }, [log])

  // ---------------- Heartbeat ----------------
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return
    heartbeatRef.current = setInterval(async () => {
      const conn = connectionRef.current
      if (conn && conn.state === signalR.HubConnectionState.Connected) {
        try {
          await safeInvoke('Ping')
          log('Heartbeat sent')
          logEventVisual('heartbeat')
        } catch (err) {
          log(`Heartbeat failed: ${err}`, 'error')
        }
      }
    }, HEARTBEAT_INTERVAL)
  }, [safeInvoke, log, logEventVisual])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])


  // ---------------- Rejoin groups ----------------
  const rejoinAll = useCallback(async () => {
    const conn = connectionRef.current
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return
    for (const [id, count] of convCountsRef.current.entries()) if (count > 0) { await safeInvoke('JoinConversationGroup', id); joinCountsRef.current.conv += 1 }
    for (const [phone, count] of phoneCountsRef.current.entries()) if (count > 0) { await safeInvoke('JoinPhoneGroup', phone); joinCountsRef.current.phone += 1 }
    log('Rejoined all groups')
    logDashboard()
  }, [safeInvoke, logDashboard, log])

  // ---------------- Hub creation ----------------
  const createConnection = useCallback((hubUrl: string, forceWebSockets = false) => {
    const withUrlOptions: signalR.IHttpConnectionOptions = forceWebSockets
      ? { withCredentials: false, skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets }
      : { withCredentials: false };
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, withUrlOptions)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build()

    conn.on('conversationUpdated', (p: unknown) => {
      const payload = p as ConversationUpdatedPayload
      onUpdatedSubs.current.forEach(cb => { try { cb(payload) } catch {} })
      logEventVisual('updated')
    })

    conn.on('conversationCreated', (p: unknown) => {
      onCreatedSubs.current.forEach(cb => { try { cb(p) } catch {} })
      logEventVisual('created')
    })

    // Evita warning quando o servidor envia 'pong' em resposta ao Ping
    conn.on('pong', () => {})

    conn.onclose(() => {
      setState(conn.state)
      log('Disconnected, stopping heartbeat', 'warn')
      stopHeartbeat()
      reconnectCountRef.current += 1
      logEventVisual('reconnect')
      logDashboard()
    })

    conn.onreconnecting((err) => {
      setState(conn.state)
      log(`Reconnecting${err ? ': ' + err : ''}`, 'warn')
      logDashboard()
    })

    conn.onreconnected(async (connectionId) => {
      setState(conn.state)
      log(`Reconnected with connectionId: ${connectionId}`)
      await rejoinAll()
      startHeartbeat()
      logDashboard()
      logEventVisual('reconnect')
    })

    return conn
  }, [logDashboard, stopHeartbeat, rejoinAll, startHeartbeat, log, logEventVisual])

  // ---------------- Hub URL ----------------
  const ensureHubUrl = useCallback(async (): Promise<string | null> => {
    if (hubUrlRef.current) return hubUrlRef.current
    try {
      const r = await fetch('/api/hub-url', { cache: 'no-store' })
      const j = await r.json()
      const url = typeof j?.hubUrl === 'string' ? j.hubUrl : ''
      hubUrlRef.current = url
      return url || null
    } catch {
      log('Failed to fetch hub URL', 'error')
      return null
    }
  }, [log])

  // ---------------- Ensure connection ----------------
  const ensureConnected = useCallback(async (): Promise<signalR.HubConnection | null> => {
    if (connectionRef.current && connectionRef.current.state !== signalR.HubConnectionState.Disconnected) {
      return connectionRef.current
    }
    const hubUrl = await ensureHubUrl()
    if (!hubUrl) return null

    let conn = createConnection(hubUrl)
    try { await conn.start() } catch {
      log('Fallback: starting with WebSockets', 'warn')
      conn = createConnection(hubUrl, true)
      await conn.start()
    }
    connectionRef.current = conn
    setState(conn.state)
    log('Connected')
    startHeartbeat()
    logDashboard()
    return conn
  }, [createConnection, ensureHubUrl, startHeartbeat, logDashboard, log])

  

  // ---------------- Join / Leave ----------------
  const joinConversation = useCallback(async (id: number | string) => {
    const key = String(id)
    const prev = convCountsRef.current.get(key) || 0
    convCountsRef.current.set(key, prev + 1)
    if (prev === 0) {
      await safeInvoke('JoinConversationGroup', key)
      joinCountsRef.current.conv += 1
      logDashboard()
    }
  }, [safeInvoke, logDashboard])

  const leaveConversation = useCallback(async (id: number | string) => {
    const key = String(id)
    const prev = convCountsRef.current.get(key) || 0
    const next = Math.max(0, prev - 1)
    convCountsRef.current.set(key, next)
    if (prev > 0 && next === 0) {
      await safeInvoke('LeaveConversationGroup', key)
      joinCountsRef.current.conv -= 1
      logDashboard()
    }
  }, [safeInvoke, logDashboard])

  const joinPhone = useCallback(async (phone: string) => {
    const key = String(phone)
    const prev = phoneCountsRef.current.get(key) || 0
    phoneCountsRef.current.set(key, prev + 1)
    if (prev === 0) {
      await safeInvoke('JoinPhoneGroup', key)
      joinCountsRef.current.phone += 1
      logDashboard()
    }
  }, [safeInvoke, logDashboard])

  const leavePhone = useCallback(async (phone: string) => {
    const key = String(phone)
    const prev = phoneCountsRef.current.get(key) || 0
    const next = Math.max(0, prev - 1)
    phoneCountsRef.current.set(key, next)
    if (prev > 0 && next === 0) {
      await safeInvoke('LeavePhoneGroup', key)
      joinCountsRef.current.phone -= 1
      logDashboard()
    }
  }, [safeInvoke, logDashboard])

  // ---------------- Subscriptions ----------------
  const onConversationUpdated = useCallback((handler: (p: ConversationUpdatedPayload) => void) => {
    onUpdatedSubs.current.add(handler)
    return () => onUpdatedSubs.current.delete(handler)
  }, [])

  const onConversationCreated = useCallback((handler: (p: unknown) => void) => {
    onCreatedSubs.current.add(handler)
    return () => onCreatedSubs.current.delete(handler)
  }, [])

  // ---------------- Visibility ----------------
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && connectionRef.current?.state === signalR.HubConnectionState.Disconnected) {
        log('Tab visible, reconnecting...')
        connectionRef.current.start().catch(console.error)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [log])

  // ---------------- Cleanup ----------------
  useEffect(() => {
    const convSnapshot = new Map(convCountsRef.current)
    const phoneSnapshot = new Map(phoneCountsRef.current)
    return () => {
      const conn = connectionRef.current
      if (conn && conn.state === signalR.HubConnectionState.Connected) {
        for (const [id, count] of convSnapshot.entries()) if (count > 0) conn.invoke('LeaveConversationGroup', id).catch(() => {})
        for (const [phone, count] of phoneSnapshot.entries()) if (count > 0) conn.invoke('LeavePhoneGroup', phone).catch(() => {})
      }
      stopHeartbeat()
    }
  }, [stopHeartbeat])

  // Ensure connection on mount
  useEffect(() => {
    void ensureConnected()
  }, [ensureConnected])

  const value = useMemo<HubAPI>(() => ({
    state,
    joinConversation,
    leaveConversation,
    joinPhone,
    leavePhone,
    onConversationUpdated,
    onConversationCreated,
  }), [state, joinConversation, leaveConversation, joinPhone, leavePhone, onConversationUpdated, onConversationCreated])

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub(): HubAPI {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
