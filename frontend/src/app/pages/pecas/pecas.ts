import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Peca } from '../../services/api.service.js';

@Component({
  selector: 'app-pecas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pecas.html',
  styleUrl: './pecas.scss'
})
export class PecasPage implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly pecas = signal<Peca[]>([]);
  protected readonly filteredPecas = signal<Peca[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerms = signal('');

  // Modal para criar/editar peças
  protected readonly isModalOpen = signal(false);
  protected readonly selectedPeca = signal<Peca | null>(null);
  protected readonly formPeca = signal<Peca>({
    codigo: '',
    descricao: '',
    valor_compra: 0,
    valor_venda: 0,
    quantidade_estoque: 0,
    quantidade_minima: 5
  });
  protected readonly formErrors = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPecas();
  }

  loadPecas(): void {
    this.loading.set(true);
    this.apiService.getPecas().subscribe({
      next: (data) => {
        this.pecas.set(data);
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
      this.filteredPecas.set(this.pecas());
      return;
    }
    const filtered = this.pecas().filter(p => 
      p.codigo.toLowerCase().includes(term) || 
      p.descricao.toLowerCase().includes(term)
    );
    this.filteredPecas.set(filtered);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerms.set(input.value);
    this.applyFilter();
  }

  openNewPecaModal(): void {
    this.selectedPeca.set(null);
    this.formPeca.set({
      codigo: '',
      descricao: '',
      valor_compra: 0,
      valor_venda: 0,
      quantidade_estoque: 0,
      quantidade_minima: 5
    });
    this.formErrors.set(null);
    this.isModalOpen.set(true);
  }

  openEditPecaModal(peca: Peca): void {
    this.selectedPeca.set(peca);
    this.formPeca.set({ ...peca });
    this.formErrors.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  savePeca(): void {
    const pecaData = this.formPeca();
    if (!pecaData.codigo || !pecaData.descricao || pecaData.valor_compra === undefined || pecaData.valor_venda === undefined) {
      this.formErrors.set('Preencha todos os campos obrigatórios.');
      return;
    }

    const request = this.selectedPeca()
      ? this.apiService.updatePeca(this.selectedPeca()!.id!, pecaData)
      : this.apiService.createPeca(pecaData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadPecas();
      },
      error: (err) => {
        console.error(err);
        this.formErrors.set(err.error?.message || 'Erro ao salvar a peça. Verifique se o código já existe.');
      }
    });
  }

  deletePeca(id: number): void {
    if (confirm('Deseja excluir esta peça do estoque?')) {
      this.apiService.deletePeca(id).subscribe({
        next: () => {
          this.loadPecas();
        },
        error: (err) => {
          alert(err.error?.message || 'Não foi possível excluir a peça.');
        }
      });
    }
  }

  isStockCritical(peca: Peca): boolean {
    return peca.quantidade_estoque <= peca.quantidade_minima;
  }
}
