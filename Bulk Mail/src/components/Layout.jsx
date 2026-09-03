import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconDashboard, IconUsers, IconFileText, IconMegaphone, IconSend, IconReply,
  IconHeart, IconClock, IconPipeline, IconUserCheck, IconBlocked, IconSheet,
  IconSettings, IconMenu, IconBell,
} from './Icons.jsx'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: IconUsers },
  { to: '/templates', label: 'Templates', icon: IconFileText },
  { to: '/campaigns', label: 'Campaigns', icon: IconMegaphone },
  { to: '/queue', label: 'Email Queue', icon: IconSend },
  { to: '/replies', label: 'Replies', icon: IconReply },
  { to: '/interested', label: 'Interested', icon: IconHeart },
  { to: '/followups', label: 'Followups', icon: IconClock },
  { to: '/pipeline', label: 'Pipeline', icon: IconPipeline },
  { to: '/customers', label: 'Customers', icon: IconUserCheck },
  { to: '/blocked', label: 'Blocked Contacts', icon: IconBlocked },
  { to: '/sheets', label: 'Sheet Sync', icon: IconSheet },
  { to: '/batches', label: 'Lead Batches', icon: IconUsers },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

function Sidebar({ open, onClose }) {
  return (
    <>
      <div className={`sidebar-backdrop${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/Sanglogo.png" alt="Sangita Group" className="brand-logo" />
          <div className="brand-name">Sangita Bulk Email</div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="u-name">Administrator</div>
          <div className="u-role">admin</div>
        </div>
      </aside>
    </>
  )
}

function Topbar({ onMenu, title }) {
  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenu} aria-label="Menu"><IconMenu size={19} /></button>
      <h1>{title}</h1>
      <div className="topbar-spacer" />
      <button className="icon-btn" aria-label="Notifications"><IconBell size={19} /><span className="dot" /></button>
    </header>
  )
}

const TITLES = {
  '/': 'Dashboard', '/leads': 'Leads', '/templates': 'Templates', '/campaigns': 'Campaigns',
  '/queue': 'Email Queue', '/replies': 'Replies', '/interested': 'Interested', '/followups': 'Followups',
  '/pipeline': 'Pipeline', '/customers': 'Customers', '/blocked': 'Blocked Contacts',
  '/sheets': 'Sheet Sync', '/batches': 'Lead Batches', '/settings': 'Settings',
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar title={TITLES[pathname] || 'Dashboard'} onMenu={() => setSidebarOpen(true)} />
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
