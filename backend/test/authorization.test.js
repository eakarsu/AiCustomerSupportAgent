import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET='test-only-secret-that-is-at-least-thirty-two-characters';
const {authenticate}=await import('../src/middleware/auth.js');

const response=()=>({statusCode:200,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});

test('identity lookup rejects stale token tenant and role claims',async()=>{
  const token=jwt.sign({id:'u',tenantId:'tenant-a',role:'admin'},process.env.JWT_SECRET);
  const req={headers:{authorization:`Bearer ${token}`},prisma:{user:{findUnique:async()=>({id:'u',email:'u@example.test',role:'agent',tenantId:'tenant-b',subjectId:null,isActive:true})}}};
  const res=response();let nextCalled=false;await authenticate(req,res,()=>{nextCalled=true;});assert.equal(res.statusCode,403);assert.equal(nextCalled,false);
});

test('identity lookup uses the durable server role',async()=>{
  const token=jwt.sign({id:'u',tenantId:'tenant-a',role:'admin'},process.env.JWT_SECRET);
  const req={headers:{authorization:`Bearer ${token}`},prisma:{user:{findUnique:async()=>({id:'u',email:'u@example.test',role:'agent',tenantId:'tenant-a',subjectId:null,isActive:true})}}};
  const res=response();let nextCalled=false;await authenticate(req,res,()=>{nextCalled=true;});assert.equal(nextCalled,true);assert.equal(req.user.role,'agent');
});
