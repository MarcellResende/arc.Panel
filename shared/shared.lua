SERVER = IsDuplicityVersion()
CLIENT = not SERVER

local TriggerRemoteEvent = nil
local RegisterLocalEvent = nil
if SERVER then
    TriggerRemoteEvent = TriggerClientEvent
    RegisterLocalEvent = RegisterServerEvent
else
    TriggerRemoteEvent = TriggerServerEvent
    RegisterLocalEvent = RegisterNetEvent
end


function table.maxn(t)
	local max = 0
	for k,v in pairs(t) do
		local n = tonumber(k)
		if n and n > max then max = n end
	end
	return max
end

local modules = {}
function module(rsc, path)
	if path == nil then
		path = rsc
		rsc = "vrp"
	end

	local key = rsc..path
	local module = modules[key]
	if module then
		return module
	else
		local code = LoadResourceFile(rsc, path..".lua")
		if code then
			local f,err = load(code, rsc.."/"..path..".lua")
			if f then
				local ok, res = xpcall(f, debug.traceback)
				if ok then
					modules[key] = res
					return res
				else
					error("error loading module "..rsc.."/"..path..":"..res)
				end
			else
				error("error parsing module "..rsc.."/"..path..":"..debug.traceback(err))
			end
		else
			error("resource file "..rsc.."/"..path..".lua not found")
		end
	end
end

local function wait(self)
	local rets = Citizen.Await(self.p)
	if not rets then
		rets = self.r 
	end
	return table.unpack(rets,1,table.maxn(rets))
end

local function areturn(self, ...)
	self.r = {...}
	self.p:resolve(self.r)
end

function async(func)
	if func then
		Citizen.CreateThreadNow(func)
	else
		return setmetatable({ wait = wait, p = promise.new() }, { __call = areturn })
	end
end

function table.contains(table, element)
    for _, value in pairs(table) do
        if value == element then
            return true
        end
    end
    return false
end

function parseInt(v)
	local n = tonumber(v)
	if n == nil then 
		return 0
	else
		return math.floor(n)
	end
end

function parseDouble(v)
	local n = tonumber(v)
	if n == nil then n = 0 end
	return n
end

function parseFloat(v)
	return parseDouble(v)
end

local sanitize_tmp = {}
function sanitizeString(str, strchars, allow_policy)
	local r = ""
	local chars = sanitize_tmp[strchars]
	if chars == nil then
		chars = {}
		local size = string.len(strchars)
		for i=1,size do
			local char = string.sub(strchars,i,i)
			chars[char] = true
		end
		sanitize_tmp[strchars] = chars
	end

	size = string.len(str)
	for i=1,size do
		local char = string.sub(str,i,i)
		if (allow_policy and chars[char]) or (not allow_policy and not chars[char]) then
			r = r..char
		end
	end
	return r
end

function splitString(str, sep)
	if sep == nil then sep = "%s" end

	local t={}
	local i=1

	for str in string.gmatch(str, "([^"..sep.."]+)") do
		t[i] = str
		i = i + 1
	end

	return t
end

function joinStrings(list, sep)
	if sep == nil then sep = "" end

	local str = ""
	local count = 0
	local size = #list
	for k,v in pairs(list) do
		count = count+1
		str = str..v
		if count < size then str = str..sep end
	end
	return str
end

local Tools = {}
local IDGenerator = {}

function Tools.newIDGenerator()
	local r = setmetatable({}, { __index = IDGenerator })
	r:construct()
	return r
end

function IDGenerator:construct()
	self:clear()
end

function IDGenerator:clear()
	self.max = 0
	self.ids = {}
end

function IDGenerator:gen()
	if #self.ids > 0 then
		return table.remove(self.ids)
	else
		local r = self.max
		self.max = self.max+1
		return r
	end
end

function IDGenerator:free(id)
	table.insert(self.ids,id)
end

local Tunnel = {}

Tunnel.delays = {}

function Tunnel.setDestDelay(dest,delay)
	Tunnel.delays[dest] = { delay,0 }
end

local function tunnel_resolve(itable,key)
	local mtable = getmetatable(itable)
	local iname = mtable.name
	local ids = mtable.tunnel_ids
	local callbacks = mtable.tunnel_callbacks
	local identifier = mtable.identifier
	local fname = key
	local no_wait = false
	if string.sub(key,1,1) == "_" then
		fname = string.sub(key,2)
		no_wait = true
	end

	local fcall = function(...)
		local r = nil
		local profile

		local args = {...} 
		local dest = nil
		if SERVER then
			dest = args[1]
			args = {table.unpack(args,2,table.maxn(args))}
			if dest >= 0 and not no_wait then
				r = async()
			end
		elseif not no_wait then
			r = async()
		end

		local delay_data = nil
		if dest then delay_data = Tunnel.delays[dest] end
		if delay_data == nil then
			delay_data = {0,0}
		end

		local add_delay = delay_data[1]
		delay_data[2] = delay_data[2]+add_delay

		if delay_data[2] > 0 then
			SetTimeout(delay_data[2], function()
				delay_data[2] = delay_data[2]-add_delay
				local rid = -1
				if r then
					rid = ids:gen()
					callbacks[rid] = r
				end

				if SERVER then
					TriggerRemoteEvent(iname..":tunnel_req",dest,fname,args,identifier,rid)
				else
					TriggerRemoteEvent(iname..":tunnel_req",fname,args,identifier,rid)
				end
			end)
		else
			local rid = -1
			if r then
				rid = ids:gen()
				callbacks[rid] = r
			end

			if SERVER then
				TriggerRemoteEvent(iname..":tunnel_req",dest,fname,args,identifier,rid)
			else
				TriggerRemoteEvent(iname..":tunnel_req",fname,args,identifier,rid)
			end
		end

		if r then
			if profile then
				local rets = { r:wait() }
				return table.unpack(rets,1,table.maxn(rets))
			else
				return r:wait()
			end
		end
	end

	itable[key] = fcall
	return fcall
end

function Tunnel.bindInterface(name,interface)
	RegisterLocalEvent(name..":tunnel_req")
	AddEventHandler(name..":tunnel_req",function(member,args,identifier,rid)
		local source = source

		local f = interface[member]

		local rets = {}
		if type(f) == "function" then
			rets = { f(table.unpack(args,1,table.maxn(args))) }
		end

		if rid >= 0 then
			if SERVER then
				TriggerRemoteEvent(name..":"..identifier..":tunnel_res",source,rid,rets)
			else
				TriggerRemoteEvent(name..":"..identifier..":tunnel_res",rid,rets)
			end
		end
	end)
end

function Tunnel.getInterface(name,identifier)
	if not identifier then identifier = GetCurrentResourceName() end
  
	local ids = Tools.newIDGenerator()
	local callbacks = {}
	local r = setmetatable({},{ __index = tunnel_resolve, name = name, tunnel_ids = ids, tunnel_callbacks = callbacks, identifier = identifier })

	RegisterLocalEvent(name..":"..identifier..":tunnel_res")
	AddEventHandler(name..":"..identifier..":tunnel_res",function(rid,args)
		local callback = callbacks[rid]
		if callback then
			ids:free(rid)
			callbacks[rid] = nil
			callback(table.unpack(args,1,table.maxn(args)))
		end
	end)
	return r
end

local Proxy = {}

local function proxy_resolve(itable,key)
	local mtable = getmetatable(itable)
	local iname = mtable.name
	local ids = mtable.ids
	local callbacks = mtable.callbacks
	local identifier = mtable.identifier

	local fname = key
	local no_wait = false
	if string.sub(key,1,1) == "_" then
		fname = string.sub(key,2)
		no_wait = true
	end

	local fcall = function(...)
		local rid, r
		local profile

		if no_wait then
			rid = -1
		else
			r = async()
			rid = ids:gen()
			callbacks[rid] = r
		end

		local args = {...}

		TriggerEvent(iname..":proxy",fname, args, identifier, rid)
    
		if not no_wait then
			return r:wait()
		end
	end
	itable[key] = fcall
	return fcall
end

function Proxy.addInterface(name,itable)
	AddEventHandler(name..":proxy",function(member,args,identifier,rid)
		local f = itable[member]
		local rets = {}
		if type(f) == "function" then
			rets = {f(table.unpack(args,1,table.maxn(args)))}
		end
		if rid >= 0 then
			TriggerEvent(name..":"..identifier..":proxy_res",rid,rets)
		end
	end)
end

function Proxy.getInterface(name,identifier)
	if not identifier then identifier = GetCurrentResourceName() end
	local ids = Tools.newIDGenerator()
	local callbacks = {}
	local r = setmetatable({},{ __index = proxy_resolve, name = name, ids = ids, callbacks = callbacks, identifier = identifier })
	AddEventHandler(name..":"..identifier..":proxy_res", function(rid,rets)
		local callback = callbacks[rid]
		if callback then
			ids:free(rid)
			callbacks[rid] = nil
			callback(table.unpack(rets,1,table.maxn(rets)))
		end
	end)
	return r
end

return {
	Tools = Tools,
	Tunnel = Tunnel,
	Proxy = Proxy
}
