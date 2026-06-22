import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import { officers as officersApi, geo } from '../services/api.js'

const ROLE_LABELS = { admin: 'District Admin', taluk: 'Taluk Officer', field: 'Field Officer', auditor: 'Auditor' }
const ROLE_COLORS = { admin: '#0e6b86', taluk: '#2563eb', field: '#0d9488', auditor: '#7c3aed' }

const EMPTY_FORM = { name: '', email: '', role: 'field', taluk: '', phone: '', designation: '', status: 'Active' }

export default function Users() {
  const { user, toast } = useApp()
  const [users, setUsers] = useState([])
  const [taluks, setTaluks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    Promise.all([officersApi.list(), geo.taluks()])
      .then(([u, t]) => {
        setUsers(Array.isArray(u) ? u : (u.results || []))
        setTaluks(Array.isArray(t) ? t : (t.results || []))
      })
      .catch(() => toast('Failed to load users', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.designation?.toLowerCase().includes(q)
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  function openAdd() { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true) }
  function openEdit(u) {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, role: u.role, taluk: u.taluk || '', phone: u.phone, designation: u.designation, status: u.status })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast('Name required', 'error'); return }
    setSaving(true)
    try {
      if (editUser) {
        const updated = await officersApi.update(editUser.id, form)
        setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u))
        toast('Officer updated', 'success')
      } else {
        const created = await officersApi.create(form)
        setUsers(prev => [...prev, created])
        toast('Officer added', 'success')
      }
      setShowModal(false)
    } catch (e) { toast(e.message || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete officer ${u.name}?`)) return
    try {
      await officersApi.delete(u.id)
      setUsers(prev => prev.filter(o => o.id !== u.id))
      toast('Officer removed', 'info')
    } catch { toast('Delete failed', 'error') }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">

        <button className="btn-primary" onClick={openAdd}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Officer
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name, email, designation…" value={search}
          onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-48" />
        <select className="input w-auto" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(search || filterRole) && <button className="btn-secondary" onClick={() => { setSearch(''); setFilterRole('') }}>Clear</button>}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Officer','Role','Taluk','Phone','Designation','Status',''].map(h => (
                    <th key={h} className="table-head px-5 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No officers match.</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ background: ROLE_COLORS[u.role] || '#6b7280' }}>
                          {(u.name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: (ROLE_COLORS[u.role] || '#6b7280') + '18', color: ROLE_COLORS[u.role] || '#6b7280' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{u.taluk_name || '—'}</td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{u.phone || '—'}</td>
                    <td className="px-5 py-4 text-gray-600">{u.designation || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.status === 'Active' ? 'bg-green-100 text-green-700' :
                        u.status === 'On leave' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <button className="w-7 h-7 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center" onClick={() => openEdit(u)}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button className="w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" onClick={() => handleDelete(u)}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editUser ? `Edit — ${editUser.name}` : 'Add Officer'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. M. Rajesh"/></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="officer@wbms.tn.gov.in"/></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Taluk</label>
                <select className="input" value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))}>
                  <option value="">— District-level —</option>
                  {taluks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="94440 00000"/></div>
              <div><label className="label">Designation</label><input className="input" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="AE / AEE / JE"/></div>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['Active','On leave','Inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Add Officer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
