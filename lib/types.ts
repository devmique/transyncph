import { ObjectId } from 'mongodb';

// Server-side types. Only Operator and AuthToken live here; the shapes shared
// with the UI (Route, Schedule, Terminal, Announcement) are defined once in
// types/index.d.ts and imported as '@/types'.
//
// This file used to also declare Route/Schedule/Terminal/Announcement, but they
// had drifted out of sync with what the API actually stores (Route claimed
// `name`/`startTerminal`/`fare` where the collection really holds
// `routeNumber`/`startPoint`/`startTerminalId`/`estimatedTime`). Nothing
// imported them, so they were removed rather than maintained in two places.

export interface Operator {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  companyName: string;
  city: string;
  region: string;
  tier: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  operatorId: string;
  email: string;
  tier: string;
}
