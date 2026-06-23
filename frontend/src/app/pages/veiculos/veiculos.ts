import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Veiculo } from '../../services/api.service.js';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.scss'
})
export class VeiculosPage implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly veiculos = signal<Veiculo[]>([]);
  protected readonly filteredVeiculos = signal<Veiculo[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerms = signal('');

  ngOnInit(): void {
    this.loadVeiculos();
  }

  loadVeiculos(): void {
    this.loading.set(true);
    this.apiService.getVeiculos().subscribe({
      next: (data) => {
        this.veiculos.set(data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  applyFilter(): void {
    const term = this.searchTerms().toLowerCase().trim();
    if (!term) {
      this.filteredVeiculos.set(this.veiculos());
      return;
    }
    const filtered = this.veiculos().filter(v => 
      v.placa.toLowerCase().includes(term) || 
      v.marca.toLowerCase().includes(term) || 
      v.modelo.toLowerCase().includes(term) || 
      (v.cliente_nome && v.cliente_nome.toLowerCase().includes(term))
    );
    this.filteredVeiculos.set(filtered);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerms.set(input.value);
    this.applyFilter();
  }

  viewOwner(clienteId: number): void {
    // Navegar para a página de clientes e passar informação do cliente (ou podemos apenas navegar)
    this.router.navigate(['/clientes']);
  }
}
