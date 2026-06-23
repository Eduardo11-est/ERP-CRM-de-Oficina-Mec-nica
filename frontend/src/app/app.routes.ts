import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.js').then(m => m.DashboardPage) },
  { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes.js').then(m => m.ClientesPage) },
  { path: 'veiculos', loadComponent: () => import('./pages/veiculos/veiculos.js').then(m => m.VeiculosPage) },
  { path: 'pecas', loadComponent: () => import('./pages/pecas/pecas.js').then(m => m.PecasPage) },
  { path: 'ordens-servico', loadComponent: () => import('./pages/ordens-servico/ordens-servico.js').then(m => m.OrdensServicoPage) },
  { path: '**', redirectTo: 'dashboard' }
];
