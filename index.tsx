import React, { useState, useEffect, useContext, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Users, Shield, Building2, LayoutDashboard, LogOut, 
  Search, Plus, MoreVertical, Filter, ChevronLeft, ChevronRight,
  Bot, Globe, FileText, Activity, Settings as SettingsIcon, Lock,
  Menu, X
} from 'lucide-react';

// --- Types based on OpenAPI Schema ---

interface Member {
  id: number;
  username: string;
  fullName: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  isVirtual: boolean;
  agentType?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: number;
  org_id: number;
  code: string;
  name: string;
  description: string | null;
  is_position: boolean;
  active: boolean;
}

interface OrgUnit {
  id: number;
  name: string;
  type: string;
  description: string | null;
  tenantId: number;
}

interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

// --- API & Mock Service ---

const API_BASE_URL = 'http://localhost:8080/v2';
const DEFAULT_TENANT_ID = 1;

const MockData = {
  members: [
    { id: 101, username: 'admin', fullName: 'System Administrator', nickname: 'SysAdmin', email: 'admin@sys.com', status: 'active', isVirtual: false, createdAt: '2023-01-01T10:00:00Z', updatedAt: '2023-01-01T10:00:00Z' },
    { id: 102, username: 'sarah.connor', fullName: 'Sarah Connor', nickname: 'Sarah', email: 'sarah@resistance.com', status: 'active', isVirtual: false, createdAt: '2023-02-15T14:30:00Z', updatedAt: '2023-02-15T14:30:00Z' },
    { id: 103, username: 't800_bot', fullName: 'Model 101', nickname: 'Arnold', email: 't800@skynet.com', status: 'active', isVirtual: true, agentType: 'bot', createdAt: '2023-03-10T09:00:00Z', updatedAt: '2023-03-10T09:00:00Z' },
    { id: 104, username: 'john.doe', fullName: 'John Doe', nickname: 'JD', email: 'john@corp.com', status: 'inactive', isVirtual: false, createdAt: '2023-05-20T11:15:00Z', updatedAt: '2023-06-01T10:00:00Z' },
    { id: 105, username: 'gpt_helper', fullName: 'Support Assistant', nickname: 'GPT-4', email: 'ai@support.com', status: 'active', isVirtual: true, agentType: 'llm', createdAt: '2023-07-01T08:00:00Z', updatedAt: '2023-07-01T08:00:00Z' },
  ] as Member[],
  roles: [
    { id: 1, org_id: 0, code: 'ADMIN', name: 'Administrator', description: 'Full system access', is_position: false, active: true },
    { id: 2, org_id: 10, code: 'MGR', name: 'Manager', description: 'Department manager', is_position: true, active: true },
    { id: 3, org_id: 10, code: 'DEV', name: 'Developer', description: 'Software engineer', is_position: true, active: true },
  ] as Role[],
  orgs: [
    { id: 10, tenantId: 1, name: 'Headquarters', type: 'company', description: 'Main Office' },
    { id: 11, tenantId: 1, name: 'R&D Department', type: 'dept', description: 'Research and Development' },
    { id: 12, tenantId: 1, name: 'Sales Team A', type: 'team', description: 'North America Sales' },
  ] as OrgUnit[]
};

class ApiService {
  private token: string | null = localStorage.getItem('auth_token');
  private tenantId: number = parseInt(localStorage.getItem('tenant_id') || '1');
  public useMock: boolean = true; // Default to mock for demo

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  setTenantId(id: number) {
    this.tenantId = id;
    localStorage.setItem('tenant_id', id.toString());
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated() {
    return !!this.token || this.useMock; // Mock mode always authenticated for demo
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
      return this.mockHandler(endpoint, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'X-Tenant-ID': this.tenantId.toString(),
      ...options.headers,
    };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      if (res.status === 204) return null;
      return res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private mockHandler(endpoint: string, options: RequestInit) {
    const method = options.method || 'GET';
    
    if (endpoint === '/auth/login' && method === 'POST') {
      return { access_token: 'mock-jwt-token', username: 'admin', full_name: 'Mock Admin' };
    }
    if (endpoint.startsWith('/members')) {
      if (method === 'POST') {
        const body = JSON.parse(options.body as string);
        const newMember = { ...body, id: Math.floor(Math.random() * 1000), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        MockData.members.push(newMember);
        return newMember;
      }
      if (method === 'GET') return { data: MockData.members, meta: { page: 1, page_size: 20, total: MockData.members.length, total_pages: 1 } };
    }
    if (endpoint.startsWith('/roles')) return { data: MockData.roles, meta: { page: 1, page_size: 20, total: MockData.roles.length, total_pages: 1 } };
    if (endpoint.startsWith('/orgs')) return { data: MockData.orgs, meta: { page: 1, page_size: 20, total: MockData.orgs.length, total_pages: 1 } };
    
    return {};
  }

  // Methods matching OpenAPI
  async login(creds: any) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(creds) }); }
  async getMembers(params?: any) { 
    const query = new URLSearchParams(params).toString();
    return this.request(`/members?${query}`); 
  }
  async createMember(data: any) { return this.request('/members', { method: 'POST', body: JSON.stringify(data) }); }
  async getRoles() { return this.request('/roles'); }
  async getOrgs() { return this.request('/orgs'); }
}

const api = new ApiService();

// --- Context ---

const AuthContext = createContext<{ user: any, login: (c:any)=>Promise<void>, logout: ()=>void, isMock: boolean, setMock: (v:boolean)=>void } | null>(null);

const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isMock, setMockState] = useState(api.useMock);

  useEffect(() => {
    api.useMock = isMock;
  }, [isMock]);

  const login = async (creds: any) => {
    const res = await api.login(creds);
    api.setToken(res.access_token);
    api.setTenantId(creds.tenantId || 1);
    setUser({ username: res.username, fullName: res.full_name });
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const setMock = (val: boolean) => {
    setMockState(val);
    api.useMock = val;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isMock, setMock }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Components ---

const Badge = ({ type, text }: { type: 'success' | 'warning' | 'danger' | 'neutral', text: string }) => {
  const colors = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-rose-100 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[type]}`}>
      {text}
    </span>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors
      ${active ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const base = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = ({ label, ...props }: any) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...props} />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
    <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...props}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', tenantId: '1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth?.login(formData);
    } catch (e) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500">Sign in to your organization</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Username" 
            value={formData.username} 
            onChange={(e: any) => setFormData({...formData, username: e.target.value})} 
            placeholder="Enter username"
            required
          />
          <Input 
            label="Password" 
            type="password" 
            value={formData.password} 
            onChange={(e: any) => setFormData({...formData, password: e.target.value})} 
            placeholder="••••••••"
            required
          />
          <Input 
            label="Tenant ID" 
            type="number" 
            value={formData.tenantId} 
            onChange={(e: any) => setFormData({...formData, tenantId: e.target.value})} 
          />
          
          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <div className="text-center text-xs text-slate-400">
          System Version v2.4.0
        </div>
      </div>
    </div>
  );
};

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [newMember, setNewMember] = useState({ 
    username: '', fullName: '', email: '', isVirtual: false, agentType: 'llm', status: 'active' 
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.getMembers({ 
        status: filter !== 'all' ? filter : undefined,
        keyword: search || undefined
      });
      setMembers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createMember(newMember);
    setCreateOpen(false);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Members</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus size={18} /> <span className="sm:inline">Add Member</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-slate-500 flex-shrink-0" />
          <select 
            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-700">User</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Type</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Created At</th>
                <th className="px-6 py-3 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading members...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No members found.</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${member.isVirtual ? 'bg-purple-500' : 'bg-indigo-500'}`}>
                          {member.isVirtual ? <Bot size={20} /> : (member.fullName || member.username).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{member.fullName || 'N/A'}</div>
                          <div className="text-slate-500 text-xs">@{member.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.isVirtual ? (
                        <Badge type="neutral" text={`Agent: ${member.agentType || 'Unknown'}`} />
                      ) : (
                        <Badge type="neutral" text="Human" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        type={member.status === 'active' ? 'success' : member.status === 'suspended' ? 'danger' : 'warning'} 
                        text={member.status.toUpperCase()} 
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination (Visual Only for Demo) */}
        <div className="px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">Showing {members.length} results</span>
          <div className="flex gap-1">
            <button className="p-1 border rounded hover:bg-slate-50 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
            <button className="p-1 border rounded hover:bg-slate-50 disabled:opacity-50" disabled><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} title="Add New Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Username" required value={newMember.username} onChange={(e:any) => setNewMember({...newMember, username: e.target.value})} />
          <Input label="Full Name" value={newMember.fullName} onChange={(e:any) => setNewMember({...newMember, fullName: e.target.value})} />
          <Input label="Email" type="email" required value={newMember.email} onChange={(e:any) => setNewMember({...newMember, email: e.target.value})} />
          
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="isVirtual" 
              checked={newMember.isVirtual} 
              onChange={(e) => setNewMember({...newMember, isVirtual: e.target.checked})}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isVirtual" className="text-sm text-slate-700 select-none">Is Virtual Agent?</label>
          </div>

          {newMember.isVirtual && (
            <Select 
              label="Agent Type" 
              value={newMember.agentType} 
              onChange={(e:any) => setNewMember({...newMember, agentType: e.target.value})}
              options={[
                { value: 'llm', label: 'LLM Model' },
                { value: 'workflow', label: 'Workflow Automation' },
                { value: 'bot', label: 'Simple Bot' }
              ]}
            />
          )}

          <Select 
            label="Status" 
            value={newMember.status} 
            onChange={(e:any) => setNewMember({...newMember, status: e.target.value})}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const RolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRoles().then(res => {
      setRoles(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
        <Button className="gap-2 w-full sm:w-auto"><Plus size={18} /> Create Role</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p>Loading...</p> : roles.map(role => (
          <div key={role.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${role.is_position ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {role.is_position ? <Users size={20} /> : <Shield size={20} />}
              </div>
              <Badge type={role.active ? 'success' : 'neutral'} text={role.active ? 'Active' : 'Inactive'} />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">{role.name}</h3>
            <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{role.description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{role.code}</span>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Org: {role.org_id === 0 ? 'Global' : role.org_id}</span>
            </div>
            <Button variant="secondary" className="w-full text-xs">Manage Permissions</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrgsPage = () => {
  const [orgs, setOrgs] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrgs().then(res => {
      setOrgs(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Organization Structure</h1>
        <Button className="gap-2 w-full sm:w-auto"><Plus size={18} /> Add Unit</Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <ul className="divide-y divide-slate-100">
            {orgs.map(org => (
              <li key={org.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-lg text-slate-500 flex-shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-lg">{org.name}</div>
                    <div className="text-sm text-slate-500">{org.type.toUpperCase()} • ID: {org.id}</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                   <div className="text-sm text-slate-400 truncate max-w-xs">{org.description}</div>
                   <Button variant="secondary" className="py-1 px-3 text-xs w-full sm:w-auto">Details</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- Layout & Routing ---

const AppLayout = () => {
  const auth = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simple view router
  const renderContent = () => {
    switch(activeTab) {
      case 'members': return <MembersPage />;
      case 'roles': return <RolesPage />;
      case 'orgs': return <OrgsPage />;
      default: return (
        <div className="p-4 sm:p-8 text-center bg-white rounded-xl border border-slate-200 border-dashed">
          <LayoutDashboard className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-medium text-slate-700">Dashboard Dashboard</h2>
          <p className="text-slate-500 mt-2">Welcome to the V2.4 Membership Management System.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-left">
             <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="text-2xl font-bold text-indigo-700">1,240</div>
                <div className="text-sm text-indigo-600">Total Members</div>
             </div>
             <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-700">45</div>
                <div className="text-sm text-emerald-600">Active Agents</div>
             </div>
             <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-2xl font-bold text-amber-700">12</div>
                <div className="text-sm text-amber-600">Pending Requests</div>
             </div>
          </div>
        </div>
      );
    }
  };

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">MemberSys</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleNavClick('dashboard')} />
          <SidebarItem icon={Users} label="Members" active={activeTab === 'members'} onClick={() => handleNavClick('members')} />
          <SidebarItem icon={Shield} label="Roles & Perms" active={activeTab === 'roles'} onClick={() => handleNavClick('roles')} />
          <SidebarItem icon={Building2} label="Organizations" active={activeTab === 'orgs'} onClick={() => handleNavClick('orgs')} />
          <div className="pt-6 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</div>
          <SidebarItem icon={Bot} label="AI Agents" onClick={() => {}} />
          <SidebarItem icon={Globe} label="Localization" onClick={() => {}} />
          <SidebarItem icon={FileText} label="Audit Logs" onClick={() => {}} />
          <SidebarItem icon={SettingsIcon} label="Settings" onClick={() => {}} />
        </nav>

        <div className="p-4 border-t border-slate-200">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                {auth?.user?.username?.substring(0,2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-slate-900 truncate">{auth?.user?.fullName}</div>
                <div className="text-xs text-slate-500 truncate">@{auth?.user?.username}</div>
              </div>
           </div>
           <button onClick={auth?.logout} className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition-colors py-2">
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-8">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
              >
                <Menu size={24} />
              </button>
              <div className="text-sm text-slate-500 hidden sm:block">Tenant ID: <span className="font-mono font-medium text-slate-700">1</span></div>
           </div>
           <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                <input type="checkbox" checked={auth?.isMock} onChange={(e) => auth?.setMock(e.target.checked)} className="rounded text-indigo-600" />
                <span className="hidden sm:inline">Mock API Mode</span>
                <span className="sm:hidden">Mock</span>
              </label>
              <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full relative">
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
                <Activity size={20} />
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const auth = useContext(AuthContext);
  if (!auth) return null;
  return auth.user || auth.isMock ? <AppLayout /> : <LoginPage />;
};

// Main Entry
const root = createRoot(document.getElementById('root')!);
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);