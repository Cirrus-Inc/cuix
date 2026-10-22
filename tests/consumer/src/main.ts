import './app.css';
import { createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.ts';
import { MapPage } from './Map.ts';

createRoot(document.getElementById('root')!).render(createElement(Fragment, null, App(), MapPage()));
