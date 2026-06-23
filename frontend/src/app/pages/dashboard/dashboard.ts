import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardPage implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly stats = signal<any>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.apiService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Erro ao carregar estatísticas do painel.');
        this.loading.set(false);
      }
    });
  }

  // Helper para obter a cor correspondente ao status da OS
  getStatusClass(status: string): string {
    switch (status) {
      case 'Orçamento': return 'badge-orcamento';
      case 'Aprovado': return 'badge-aprovado';
      case 'Em Execução': return 'badge-execucao';
      case 'Aguardando Peças': return 'badge-aguardando';
      case 'Concluído': return 'badge-concluido';
      case 'Cancelado': return 'badge-cancelado';
      default: return '';
    }
  }

  // Cálculos para o gráfico SVG de Faturamento
  getMaxMonthlyValue(mensal: any[]): number {
    if (!mensal || mensal.length === 0) return 1;
    return Math.max(...mensal.map(m => Number(m.total)), 1);
  }

  getBarHeight(value: number, max: number): number {
    const maxHeight = 120; // altura máxima em pixels do gráfico
    return (value / max) * maxHeight;
  }
}
