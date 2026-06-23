import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Cliente, Veiculo } from '../../services/api.service.js';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class ClientesPage implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly filteredClientes = signal<Cliente[]>([]);
  protected readonly loading = signal(true);
  
  // Controle de Pesquisa
  protected readonly searchTerms = signal('');

  // Modais e Formulários Clientes
  protected readonly isModalClienteOpen = signal(false);
  protected readonly selectedCliente = signal<Cliente | null>(null);
  protected readonly formCliente = signal<Cliente>({ nome: '', documento: '', email: '', telefone: '', endereco: '' });
  protected readonly formClienteErrors = signal<string | null>(null);

  // Detalhes e Veículos do Cliente Selecionado
  protected readonly activeCliente = signal<Cliente | null>(null);
  protected readonly activeVehicles = signal<Veiculo[]>([]);
  protected readonly isModalVeiculoOpen = signal(false);
  protected readonly formVeiculo = signal<Veiculo>({ cliente_id: 0, marca: '', modelo: '', ano: 2020, placa: '', chassi: '', quilometragem: 0 });
  protected readonly formVeiculoErrors = signal<string | null>(null);

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.loading.set(true);
    this.apiService.getClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);
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
      this.filteredClientes.set(this.clientes());
      return;
    }
    const filtered = this.clientes().filter(c => 
      c.nome.toLowerCase().includes(term) || 
      c.documento.toLowerCase().includes(term) || 
      (c.email && c.email.toLowerCase().includes(term)) ||
      c.telefone.includes(term)
    );
    this.filteredClientes.set(filtered);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerms.set(input.value);
    this.applyFilter();
  }

  // --- CLIENTES ACTIONS ---
  openNewClienteModal(): void {
    this.selectedCliente.set(null);
    this.formCliente.set({ nome: '', documento: '', email: '', telefone: '', endereco: '' });
    this.formClienteErrors.set(null);
    this.isModalClienteOpen.set(true);
  }

  openEditClienteModal(cliente: Cliente): void {
    this.selectedCliente.set(cliente);
    this.formCliente.set({ ...cliente });
    this.formClienteErrors.set(null);
    this.isModalClienteOpen.set(true);
  }

  closeClienteModal(): void {
    this.isModalClienteOpen.set(false);
  }

  saveCliente(): void {
    const clienteData = this.formCliente();
    if (!clienteData.nome || !clienteData.documento || !clienteData.telefone) {
      this.formClienteErrors.set('Preencha todos os campos obrigatórios (Nome, Documento e Telefone).');
      return;
    }

    const request = this.selectedCliente() 
      ? this.apiService.updateCliente(this.selectedCliente()!.id!, clienteData)
      : this.apiService.createCliente(clienteData);

    request.subscribe({
      next: () => {
        this.closeClienteModal();
        this.loadClientes();
        if (this.activeCliente() && this.selectedCliente()?.id === this.activeCliente()?.id) {
          // Atualiza as infos do cliente ativo exibidas na direita
          this.selectCliente(this.clientes().find(c => c.id === this.selectedCliente()?.id)!);
        }
      },
      error: (err) => {
        console.error(err);
        this.formClienteErrors.set(err.error?.message || 'Erro ao salvar o cliente. Verifique os dados.');
      }
    });
  }

  deleteCliente(id: number): void {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      this.apiService.deleteCliente(id).subscribe({
        next: () => {
          if (this.activeCliente()?.id === id) {
            this.activeCliente.set(null);
            this.activeVehicles.set([]);
          }
          this.loadClientes();
        },
        error: (err) => {
          alert(err.error?.message || 'Não foi possível excluir o cliente.');
        }
      });
    }
  }

  // Selecionar Cliente para Ver Detalhes e Veículos
  selectCliente(cliente: Cliente): void {
    this.activeCliente.set(cliente);
    this.apiService.getVeiculosByCliente(cliente.id!).subscribe({
      next: (vehicles) => {
        this.activeVehicles.set(vehicles);
      },
      error: (err) => console.error(err)
    });
  }

  // --- VEÍCULOS ACTIONS ---
  openNewVeiculoModal(): void {
    if (!this.activeCliente()) return;
    this.formVeiculo.set({
      cliente_id: this.activeCliente()!.id!,
      marca: '',
      modelo: '',
      ano: new Date().getFullYear(),
      placa: '',
      chassi: '',
      quilometragem: 0
    });
    this.formVeiculoErrors.set(null);
    this.isModalVeiculoOpen.set(true);
  }

  closeVeiculoModal(): void {
    this.isModalVeiculoOpen.set(false);
  }

  saveVeiculo(): void {
    const veiculoData = this.formVeiculo();
    if (!veiculoData.marca || !veiculoData.modelo || !veiculoData.placa || !veiculoData.ano) {
      this.formVeiculoErrors.set('Preencha os campos obrigatórios (Marca, Modelo, Ano e Placa).');
      return;
    }

    this.apiService.createVeiculo(veiculoData).subscribe({
      next: () => {
        this.closeVeiculoModal();
        if (this.activeCliente()) {
          this.selectCliente(this.activeCliente()!); // Recarrega veículos
        }
      },
      error: (err) => {
        console.error(err);
        this.formVeiculoErrors.set(err.error?.message || 'Erro ao cadastrar o veículo. Verifique se a placa já existe.');
      }
    });
  }

  deleteVeiculo(vehicleId: number): void {
    if (confirm('Deseja excluir este veículo?')) {
      this.apiService.deleteVeiculo(vehicleId).subscribe({
        next: () => {
          if (this.activeCliente()) {
            this.selectCliente(this.activeCliente()!);
          }
        },
        error: (err) => {
          alert(err.error?.message || 'Não foi possível excluir o veículo.');
        }
      });
    }
  }
}
