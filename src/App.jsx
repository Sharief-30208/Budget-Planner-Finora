
import { cloneElement, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

const USERS = 'finora_users_v2'
const CURRENT = 'finora_current_user_v2'
const TX = 'finora_transactions_v2'
const BUDGET = 'finora_budget_v2'

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const money = n =>
  '₹' + Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  })

function ensureHead() {
  const users = read(USERS, [])

  if (!users.some(u => u.role === 'head')) {
    users.push({
      id: 'head-fixed',
      name: 'Head',
      email: 'head@finora.demo',
      password: 'Head@123',
      role: 'head',
      status: 'active'
    })
  }

  localStorage.setItem(USERS, JSON.stringify(users))
}

export default function App() {
  const [users, setUsers] = useState(() => {
    ensureHead()
    return read(USERS, [])
  })

  const [current, setCurrent] = useState(() =>
    read(CURRENT, null)
  )

  const [tx, setTx] = useState(() => read(TX, []))
  const [budget, setBudget] = useState(() => read(BUDGET, {}))

  const navigate = useNavigate()

  useEffect(() => localStorage.setItem(USERS, JSON.stringify(users)), [users])
  useEffect(() => localStorage.setItem(TX, JSON.stringify(tx)), [tx])
  useEffect(() => localStorage.setItem(BUDGET, JSON.stringify(budget)), [budget])

  useEffect(() => {
    if (current) {
      localStorage.setItem(CURRENT, JSON.stringify(current))
    } else {
      localStorage.removeItem(CURRENT)
    }
  }, [current])

  const logout = () => {
    setCurrent(null)
    navigate('/login')
  }

  const login = (email, password) => {
    const user = users.find(
      u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    )

    if (!user) return 'Invalid email or password.'

    if (user.status !== 'active') {
      return user.status === 'pending'
        ? 'Your admin account is waiting for Head approval.'
        : 'Your account is inactive.'
    }

    setCurrent(user)

    navigate(
      user.role === 'head'
        ? '/head'
        : user.role === 'admin'
        ? '/admin'
        : '/dashboard'
    )

    return ''
  }

  const signup = data => {
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return 'Email already registered.'
    }

    const user = {
      ...data,
      id: crypto.randomUUID(),
      role: data.role,
      status: data.role === 'admin' ? 'pending' : 'active'
    }

    setUsers(prev => [...prev, user])

    return data.role === 'admin'
      ? 'Admin registration submitted. Wait for Head activation.'
      : 'Account created. You can log in.'
  }

  const addTx = item => {
    setTx(prev => [
      {
        ...item,
        id: crypto.randomUUID(),
        userId: current.id,
        date: item.date || new Date().toISOString().slice(0, 10)
      },
      ...prev
    ])
  }

  const updateTx = (id, item) => {
    setTx(prev =>
      prev.map(t => (t.id === id ? { ...t, ...item } : t))
    )
  }

  const deleteTx = id => {
    setTx(prev => prev.filter(t => t.id !== id))
  }

  const mine = tx.filter(t => t.userId === current?.id)

  const guard = (role, element) =>
    current?.role === role
      ? element
      : <Navigate to="/login" replace />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Finora<span>.</span></div>

        <div className="top-right">
          {current ? (
            <>
              <span className="muted">
                {current.name} · {current.role}
              </span>
              <button className="btn secondary small" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>

      <Routes>
        <Route
          path="/login"
          element={<AuthPage mode="login" login={login} signup={signup} />}
        />

        <Route
          path="/signup"
          element={<AuthPage mode="signup" login={login} signup={signup} />}
        />

        <Route
          path="/head/*"
          element={guard(
            'head',
            <Shell role="head">
              <HeadPage users={users} setUsers={setUsers} tx={tx} />
            </Shell>
          )}
        />

        <Route
          path="/admin/*"
          element={guard(
            'admin',
            <Shell role="admin">
              <AdminPage users={users} tx={tx} />
            </Shell>
          )}
        />

        <Route
          path="/*"
          element={
            current?.role === 'user' ? (
              <Shell role="user">
                <UserArea
                  current={current}
                  tx={mine}
                  addTx={addTx}
                  updateTx={updateTx}
                  deleteTx={deleteTx}
                  budget={budget}
                  setBudget={setBudget}
                />
              </Shell>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

function AuthPage({ mode, login, signup }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  })

  const [msg, setMsg] = useState('')

  const change = e =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const submit = e => {
    e.preventDefault()
    setMsg(
      mode === 'login'
        ? login(form.email, form.password)
        : signup(form)
    )
  }

  return (
    <div className="auth">
      <div className="brand">Finora<span>.</span></div>

      <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
      <p className="muted">Smart Budget Planner</p>

      <form onSubmit={submit}>
        {mode === 'signup' && (
          <>
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={change}
              required
            />

            <select name="role" value={form.role} onChange={change}>
              <option value="user">User registration</option>
              <option value="admin">Admin registration</option>
            </select>
          </>
        )}

        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={form.email}
          onChange={change}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={change}
          required
        />

        <button className="btn">
          {mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>

      {msg && <div className="notice">{msg}</div>}

      <p className="muted">
        {mode === 'login' ? (
          <>New here? <Link to="/signup">Create an account</Link></>
        ) : (
          <>Already registered? <Link to="/login">Login</Link></>
        )}
      </p>

      {mode === 'login' && (
        <p className="muted">
          Demo Head: head@finora.demo / Head@123
        </p>
      )}
    </div>
  )
}

function Shell({ role, children }) {
  const [page, setPage] = useState('Dashboard')

  const items =
    role === 'head'
      ? ['Dashboard', 'Accounts', 'All Transactions']
      : role === 'admin'
      ? ['Dashboard', 'Users & Transactions']
      : ['Dashboard', 'Transactions', 'Budget', 'Analytics']

  return (
    <div className="layout">
      <aside className="sidebar">
        {items.map(item => (
          <button
            key={item}
            className={'navbtn ' + (page === item ? 'active' : '')}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
      </aside>

      <main className="content">
        {cloneElement(children, { page, setPage })}
      </main>
    </div>
  )
}

function UserArea({
  current,
  tx,
  addTx,
  updateTx,
  deleteTx,
  budget,
  setBudget,
  page,
  setPage
}) {
  return (
    <UserPages
      current={current}
      tx={tx}
      addTx={addTx}
      updateTx={updateTx}
      deleteTx={deleteTx}
      budget={budget}
      setBudget={setBudget}
      page={page}
      setPage={setPage}
    />
  )
}

function UserPages({
  current,
  tx,
  addTx,
  updateTx,
  deleteTx,
  budget,
  setBudget,
  page,
  setPage
}) {
  return (
    <>
      <div className="heading">
        <div>
          <h1>{page}</h1>
          <div className="muted">
            Hello, {current.name}. Here's your financial overview.
          </div>
        </div>
      </div>

      {page === 'Dashboard' && (
        <Dashboard
          tx={tx}
          budget={budget[current.id] || 0}
          setPage={setPage}
        />
      )}

      {page === 'Transactions' && (
        <Transactions
          tx={tx}
          addTx={addTx}
          updateTx={updateTx}
          deleteTx={deleteTx}
        />
      )}

      {page === 'Budget' && (
        <BudgetPage
          tx={tx}
          value={budget[current.id] || 0}
          onSave={v =>
            setBudget(p => ({ ...p, [current.id]: v }))
          }
        />
      )}

      {page === 'Analytics' && <Analytics tx={tx} />}
    </>
  )
}

function Dashboard({ tx, budget, setPage }) {
  const income = tx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  const expense = tx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const balance = income - expense

  return (
    <>
      <div className="cards">
        <Stat title="Total Income" value={money(income)} tone="green" />
        <Stat title="Total Expenses" value={money(expense)} tone="red" />
        <Stat title="Available Balance" value={money(balance)} />
        <Stat title="Monthly Budget" value={money(budget)} />
      </div>

      <div className="panels">
        <section className="panel">
          <h3>Income vs Expenses</h3>

          <div className="formrow">
            <div className="field">
              <label>Total income</label>
              <strong className="green">{money(income)}</strong>
            </div>

            <div className="field">
              <label>Total expenses</label>
              <strong className="red">{money(expense)}</strong>
            </div>
          </div>

          <div className="bar">
            <div
              style={{
                width: `${
                  income + expense
                    ? income / (income + expense) * 100
                    : 0
                }%`
              }}
            />
          </div>

          <p className="muted">
            Dashboard calculations update when you add a transaction.
          </p>

          <button className="btn" onClick={() => setPage('Transactions')}>
            Manage transactions
          </button>
        </section>

        <section className="panel">
          <h3>Recent Transactions</h3>
          <TransactionTable tx={tx.slice(0, 5)} />
        </section>
      </div>
    </>
  )
}

function Stat({ title, value, tone }) {
  return (
    <div className="card">
      <small>{title}</small>
      <div className={'amount ' + (tone || '')}>{value}</div>
    </div>
  )
}

function Transactions({ tx, addTx, updateTx, deleteTx }) {
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    category: 'Food',
    amount: '',
    date: new Date().toISOString().slice(0, 10)
  })

  const [edit, setEdit] = useState(null)

  const submit = e => {
    e.preventDefault()
    if (Number(form.amount) <= 0) return

    if (edit) {
      updateTx(edit, form)
      setEdit(null)
    } else {
      addTx(form)
    }

    setForm({ ...form, title: '', amount: '' })
  }

  const startEdit = t => {
    setEdit(t.id)
    setForm({
      type: t.type,
      title: t.title,
      category: t.category,
      amount: t.amount,
      date: t.date
    })
  }

  return (
    <>
      <section className="panel" id="add-transaction">
        <h3>{edit ? 'Edit transaction' : 'Add income or expense'}</h3>

        <form onSubmit={submit}>
          <div className="formrow">
            <div className="field">
              <label>Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="field">
              <label>Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Salary / Groceries"
                required
              />
            </div>

            <div className="field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={e =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {[
                  'Food',
                  'Travel',
                  'Shopping',
                  'Bills',
                  'Education',
                  'Salary',
                  'Freelance',
                  'Other'
                ].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="formrow">
            <div className="field">
              <label>Amount (₹)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <button className="btn">
            {edit ? 'Save changes' : 'Add transaction'}
          </button>

          {edit && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setEdit(null)
                setForm({ ...form, title: '', amount: '' })
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h3>All Transactions</h3>

        <TransactionTable
          tx={tx}
          actions={t => (
            <div className="actions">
              <button
                className="btn secondary small"
                onClick={() => startEdit(t)}
              >
                Edit
              </button>

              <button
                className="btn danger small"
                onClick={() => deleteTx(t.id)}
              >
                Delete
              </button>
            </div>
          )}
        />
      </section>
    </>
  )
}

function TransactionTable({ tx, actions }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {tx.length ? (
            tx.map(t => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.category}</td>
                <td>{t.date}</td>
                <td>
                  <span className={'pill ' + (t.type === 'expense' ? 'off' : '')}>
                    {t.type}
                  </span>
                </td>
                <td className={t.type === 'income' ? 'green' : 'red'}>
                  {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                </td>
                {actions && <td>{actions(t)}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="empty">
                No transactions yet. Add your first income or expense.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function BudgetPage({ tx, value, onSave }) {
  const [v, setV] = useState(value)

  const expense = tx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <section className="panel">
      <h3>Monthly Budget</h3>

      <div className="formrow">
        <div className="field">
          <label>Set your monthly budget (₹)</label>
          <input
            type="number"
            min="0"
            value={v}
            onChange={e => setV(e.target.value)}
          />
        </div>

        <div style={{ alignSelf: 'end' }}>
          <button className="btn" onClick={() => onSave(Number(v))}>
            Save budget
          </button>
        </div>
      </div>

      <h2>{money(Math.max(0, Number(v) - expense))} remaining</h2>
      <p className="muted">
        Expenses recorded: {money(expense)} of {money(v)}
      </p>

      <div className="bar">
        <div
          style={{
            width: `${Number(v) ? Math.min(100, expense / Number(v) * 100) : 0}%`
          }}
        />
      </div>
    </section>
  )
}

function Analytics({ tx }) {
  const income = tx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  const expense = tx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const cats = {}

  tx.filter(t => t.type === 'expense').forEach(t => {
    cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
  })

  return (
    <>
      <div className="cards">
        <Stat title="Income" value={money(income)} tone="green" />
        <Stat title="Expenses" value={money(expense)} tone="red" />
        <Stat title="Net savings" value={money(income - expense)} />
      </div>

      <section className="panel">
        <h3>Expense by Category</h3>

        {Object.entries(cats).length ? (
          Object.entries(cats).map(([category, amount]) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{category}</b>
                <span>{money(amount)}</span>
              </div>

              <div className="bar">
                <div
                  style={{
                    width: `${expense ? amount / expense * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="empty">Add expenses to see category analytics.</p>
        )}
      </section>
    </>
  )
}

function HeadPage({ users, setUsers, tx, page, setPage }) {
  const [query, setQuery] = useState('')

  const people = users.filter(u => u.role !== 'head')
  const admins = people.filter(u => u.role === 'admin')
  const normal = people.filter(u => u.role === 'user')

  const change = (id, updates) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))

  const remove = id => {
    if (window.confirm('Delete this account?')) {
      setUsers(prev => prev.filter(u => u.id !== id))
    }
  }

  const filtered = people.filter(u =>
    (u.name + ' ' + u.email + ' ' + u.role)
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  return (
    <>
      <div className="heading">
        <div>
          <h1>Head Control Panel</h1>
          <div className="muted">
            Manage platform accounts and view all activity.
          </div>
        </div>
      </div>

      <div className="cards">
        <Stat title="Total users" value={normal.length} />
        <Stat title="Total admins" value={admins.length} />
        <Stat title="Total transactions" value={tx.length} />
        <Stat
          title="Pending admins"
          value={admins.filter(a => a.status === 'pending').length}
        />
      </div>

      {page === 'Dashboard' && (
        <section className="panel">
          <h3>Platform overview</h3>
          <p>
            Head can activate, deactivate or delete any admin or user
            account and review all platform transactions.
          </p>
          <button className="btn" onClick={() => setPage('Accounts')}>
            Manage accounts
          </button>
        </section>
      )}

      {page === 'Accounts' && (
        <section className="panel">
          <h3>Admin and User Accounts</h3>

          <input
            placeholder="Search name, email or role"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              padding: 11,
              border: '1px solid #dce3eb',
              borderRadius: 8,
              width: '100%',
              marginBottom: 14
            }}
          />

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={'pill ' + (u.status === 'active' ? '' : 'pending')}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {u.status === 'active' ? (
                          <button
                            className="btn secondary small"
                            onClick={() => change(u.id, { status: 'inactive' })}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="btn small"
                            onClick={() => change(u.id, { status: 'active' })}
                          >
                            Activate
                          </button>
                        )}

                        <button
                          className="btn danger small"
                          onClick={() => remove(u.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {page === 'All Transactions' && (
        <section className="panel">
          <h3>All Platform Transactions</h3>
          <TransactionTable
            tx={tx.map(t => ({
              ...t,
              title:
                (users.find(u => u.id === t.userId)?.name || 'Unknown') +
                ' — ' + t.title
            }))}
          />
        </section>
      )}
    </>
  )
}

function AdminPage({ users, tx, page }) {
  const [selected, setSelected] = useState('')

  const normal = users.filter(u => u.role === 'user')
  const shown = selected
    ? tx.filter(t => t.userId === selected)
    : tx

  return (
    <>
      <div className="heading">
        <div>
          <h1>Admin Dashboard</h1>
          <div className="muted">
            View registered users and their transactions.
          </div>
        </div>
      </div>

      <div className="cards">
        <Stat title="Registered users" value={normal.length} />
        <Stat title="Total transactions" value={tx.length} />
      </div>

      <section className="panel">
        <h3>Users</h3>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {normal.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td>
                    <button
                      className="btn secondary small"
                      onClick={() => setSelected(u.id)}
                    >
                      View transactions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h3>{selected ? 'Selected user transactions' : 'All user transactions'}</h3>

        {selected && (
          <button
            className="btn secondary small"
            onClick={() => setSelected('')}
          >
            Show all
          </button>
        )}

        <TransactionTable
          tx={shown.map(t => ({
            ...t,
            title:
              (users.find(u => u.id === t.userId)?.name || 'Unknown') +
              ' — ' + t.title
          }))}
        />
      </section>
    </>
  )
}
