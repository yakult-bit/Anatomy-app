import {publicPages} from './build/public-pages-plugin';
import {cspDrei} from './build/csp-drei-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sites } from './build/sites-vite-plugin';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ plugins:[cspDrei(),react(),sites(),publicPages()], resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}}, server:{host:'0.0.0.0',allowedHosts:['terminal.local']}, build:{chunkSizeWarningLimit:1500} });
