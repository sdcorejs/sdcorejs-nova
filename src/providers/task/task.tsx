'use client';
import {createContext,useState,type ReactNode} from 'react';
import {TaskRegistry} from './task-store.js';
export type TaskProviderProps={children:ReactNode};
export const TaskContext=createContext<TaskRegistry|null>(null);
/** Explicit sharing boundary. Separate providers and unprovided hooks never share work. */
export function TaskProvider({children}:TaskProviderProps){const [registry]=useState(()=>new TaskRegistry());return <TaskContext value={registry}>{children}</TaskContext>;}
