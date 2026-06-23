import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Cliente, Veiculo, Peca, ServicoCatalog, OrdemServico, OsItemPeca, OsItemServico, Faturamento, ParcelaFaturamento } from '../../services/api.service.js';

@Component({
  selector: 'app-ordens-servico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ordens-servico.html',
  styleUrl: './ordens-servico.scss'
})
export class OrdensServicoPage implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly ordens = signal<OrdemServico[]>([]);
  protected readonly filteredOrdens = signal<OrdemServico[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly veiculos = signal<Veiculo[]>([]);
  protected readonly pecasCatalog = signal<Peca[]>([]);
  protected readonly servicosCatalog = signal<ServicoCatalog[]>([]);
  protected readonly loading = signal(true);
  protected readonly searchTerms = signal('');

  // Modais de Controle
  protected readonly isModalOsOpen = signal(false);
  protected readonly isModalFaturarOpen = signal(false);
  protected readonly isModalVerFaturamentoOpen = signal(false);

  // Form OS
  protected readonly selectedOsId = signal<number | null>(null);
  protected readonly formOs = signal<Partial<OrdemServico>>({
    cliente_id: 0,
    veiculo_id: 0,
    status: 'Orçamento',
    valor_mao_obra: 0,
    valor_total: 0,
    observacoes: '',
    pecas: [],
    servicos: []
  });
  protected readonly osFormErrors = signal<string | null>(null);
  
  // Filtrar veículos do cliente selecionado no formulário
  protected readonly formVeiculosFiltrados = computed(() => {
    const clienteId = this.formOs().cliente_id;
    if (!clienteId) return [];
    return this.veiculos().filter(v => v.cliente_id === clienteId);
  });

  // Auxiliar de itens adicionados no form de OS
  protected readonly inputPecaId = signal<number>(0);
  protected readonly inputPecaQtd = signal<number>(1);
  protected readonly inputServId = signal<number>(0);

  // Form Faturamento
  protected readonly billingOsId = signal<number>(0);
  protected readonly billingOsTotal = signal<number>(0);
  protected readonly numInstallments = signal<number>(1);
  protected readonly billingInstallments = signal<ParcelaFaturamento[]>([]);
  protected readonly billingErrors = signal<string | null>(null);

  // Visualizar Faturamento Existente
  protected readonly activeFaturamento = signal<Faturamento | null>(null);

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    
    // Carregar catálogos
    this.apiService.getClientes().subscribe(data => this.clientes.set(data));
    this.apiService.getVeiculos().subscribe(data => this.veiculos.set(data));
    this.apiService.getPecas().subscribe(data => this.pecasCatalog.set(data));
    this.apiService.getServicos().subscribe(data => this.servicosCatalog.set(data));

    // Carregar OS
    this.apiService.getOrdensServico().subscribe({
      next: (data) => {
        this.ordens.set(data);
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
      this.filteredOrdens.set(this.ordens());
      return;
    }
    const filtered = this.ordens().filter(o => 
      o.id?.toString().includes(term) || 
      (o.cliente_nome && o.cliente_nome.toLowerCase().includes(term)) ||
      (o.veiculo_placa && o.veiculo_placa.toLowerCase().includes(term)) ||
      (o.veiculo_modelo && o.veiculo_modelo.toLowerCase().includes(term)) ||
      o.status.toLowerCase().includes(term)
    );
    this.filteredOrdens.set(filtered);
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerms.set(input.value);
    this.applyFilter();
  }

  // --- OS ACTIONS ---
  openNewOsModal(): void {
    this.selectedOsId.set(null);
    this.formOs.set({
      cliente_id: 0,
      veiculo_id: 0,
      status: 'Orçamento',
      valor_mao_obra: 0,
      valor_total: 0,
      observacoes: '',
      pecas: [],
      servicos: []
    });
    this.osFormErrors.set(null);
    this.inputPecaId.set(0);
    this.inputPecaQtd.set(1);
    this.inputServId.set(0);
    this.isModalOsOpen.set(true);
  }

  openEditOsModal(osId: number): void {
    this.selectedOsId.set(osId);
    this.osFormErrors.set(null);
    this.apiService.getOrdemServico(osId).subscribe({
      next: (data) => {
        this.formOs.set({
          cliente_id: data.cliente_id,
          veiculo_id: data.veiculo_id,
          status: data.status,
          valor_mao_obra: Number(data.valor_mao_obra),
          valor_total: Number(data.valor_total),
          observacoes: data.observacoes,
          pecas: data.pecas || [],
          servicos: data.servicos || []
        });
        this.isModalOsOpen.set(true);
      },
      error: (err) => console.error(err)
    });
  }

  closeOsModal(): void {
    this.isModalOsOpen.set(false);
  }

  // Adicionar Peça temporariamente à OS no formulário
  addPecaToOs(): void {
    const pecaId = Number(this.inputPecaId());
    const qty = Number(this.inputPecaQtd());
    if (!pecaId || qty <= 0) return;

    const catalogPeca = this.pecasCatalog().find(p => p.id === pecaId);
    if (!catalogPeca) return;

    // Verificar se peça já existe no formulário
    const currentPecas = [...(this.formOs().pecas || [])];
    const existingIndex = currentPecas.findIndex(p => p.peca_id === pecaId);

    if (existingIndex > -1) {
      currentPecas[existingIndex].quantidade += qty;
    } else {
      currentPecas.push({
        peca_id: pecaId,
        quantidade: qty,
        valor_unitario: Number(catalogPeca.valor_venda),
        codigo: catalogPeca.codigo,
        descricao: catalogPeca.descricao
      });
    }

    this.formOs.update(os => ({ ...os, pecas: currentPecas }));
    this.inputPecaId.set(0);
    this.inputPecaQtd.set(1);
    this.recalculateOsTotals();
  }

  removePecaFromOs(index: number): void {
    const currentPecas = [...(this.formOs().pecas || [])];
    currentPecas.splice(index, 1);
    this.formOs.update(os => ({ ...os, pecas: currentPecas }));
    this.recalculateOsTotals();
  }

  // Adicionar Serviço temporariamente à OS no formulário
  addServicoToOs(): void {
    const servId = Number(this.inputServId());
    if (!servId) return;

    const catalogServ = this.servicosCatalog().find(s => s.id === servId);
    if (!catalogServ) return;

    const currentServicos = [...(this.formOs().servicos || [])];
    const existingIndex = currentServicos.findIndex(s => s.servico_id === servId);

    if (existingIndex === -1) {
      currentServicos.push({
        servico_id: servId,
        quantidade: 1,
        valor_unitario: Number(catalogServ.valor_mao_obra),
        descricao: catalogServ.descricao
      });
    }

    this.formOs.update(os => ({ ...os, servicos: currentServicos }));
    this.inputServId.set(0);
    this.recalculateOsTotals();
  }

  removeServicoFromOs(index: number): void {
    const currentServicos = [...(this.formOs().servicos || [])];
    currentServicos.splice(index, 1);
    this.formOs.update(os => ({ ...os, servicos: currentServicos }));
    this.recalculateOsTotals();
  }

  // Recalcular totais da OS baseada nas peças, serviços e mão de obra
  recalculateOsTotals(): void {
    const pecasTotal = (this.formOs().pecas || []).reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
    const servicosTotal = (this.formOs().servicos || []).reduce((sum, item) => sum + (item.quantidade * item.valor_unitario), 0);
    const maoObra = Number(this.formOs().valor_mao_obra || 0);

    const total = pecasTotal + servicosTotal + maoObra;
    this.formOs.update(os => ({ ...os, valor_total: total }));
  }

  saveOs(): void {
    const osData = this.formOs();
    if (!osData.cliente_id || !osData.veiculo_id) {
      this.osFormErrors.set('Selecione um Cliente e um Veículo.');
      return;
    }

    // Se estiver aprovando, verificar se há peças suficientes no estoque
    const statusAprovados = ['Aprovado', 'Em Execução', 'Concluído'];
    if (statusAprovados.includes(osData.status || '')) {
      for (const item of (osData.pecas || [])) {
        const catalogPeca = this.pecasCatalog().find(p => p.id === item.peca_id);
        if (catalogPeca && catalogPeca.quantidade_estoque < item.quantidade) {
          // Se for uma edição e já estava ativo, o estoque já foi deduzido na OS original,
          // mas para manter simples alertamos
          this.osFormErrors.set(`Estoque insuficiente para a peça: ${catalogPeca.descricao}. Quantidade disponível: ${catalogPeca.quantidade_estoque}`);
          return;
        }
      }
    }

    const request = this.selectedOsId()
      ? this.apiService.updateOrdemServico(this.selectedOsId()!, osData)
      : this.apiService.createOrdemServico(osData as any);

    request.subscribe({
      next: () => {
        this.closeOsModal();
        this.loadAllData();
      },
      error: (err) => {
        console.error(err);
        this.osFormErrors.set(err.error?.message || 'Erro ao salvar a ordem de serviço.');
      }
    });
  }

  deleteOs(id: number): void {
    if (confirm('Deseja excluir permanentemente esta ordem de serviço? Qualquer alteração de estoque será revertida.')) {
      this.apiService.deleteOrdemServico(id).subscribe({
        next: () => this.loadAllData(),
        error: (err) => alert(err.error?.message || 'Erro ao excluir OS.')
      });
    }
  }

  // --- FATURAMENTO ACTIONS ---
  openFaturarModal(os: OrdemServico): void {
    this.billingOsId.set(os.id!);
    this.billingOsTotal.set(Number(os.valor_total));
    this.numInstallments.set(1);
    this.billingErrors.set(null);
    this.generateInstallments();
    this.isModalFaturarOpen.set(true);
  }

  closeFaturarModal(): void {
    this.isModalFaturarOpen.set(false);
  }

  // Gera parcelas dividindo o total igualmente
  generateInstallments(): void {
    const total = this.billingOsTotal();
    const count = Number(this.numInstallments());
    const baseValue = Math.floor((total / count) * 100) / 100;
    const diff = Number((total - (baseValue * count)).toFixed(2)); // Diferença de centavos fica na primeira parcela

    const list: ParcelaFaturamento[] = [];
    const today = new Date();

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + (i - 1) * 30);
      const isFirst = i === 1;

      list.push({
        numero_parcela: i,
        valor: isFirst ? baseValue + diff : baseValue,
        forma_pagamento: 'Pix', // Forma padrão
        status: isFirst ? 'Pago' : 'Pendente', // 1a parcela paga por padrão, outras pendentes
        data_vencimento: dueDate.toISOString().slice(0, 10),
        data_pagamento: isFirst ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
      });
    }

    this.billingInstallments.set(list);
  }

  onInstallmentCountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.numInstallments.set(Number(input.value));
    this.generateInstallments();
  }

  saveFaturamento(): void {
    const installments = this.billingInstallments();
    // Validar se soma das parcelas bate com total
    const sum = installments.reduce((acc, p) => acc + Number(p.valor), 0);
    
    if (Math.abs(sum - this.billingOsTotal()) > 0.02) {
      this.billingErrors.set('A soma das parcelas deve ser igual ao valor total da OS.');
      return;
    }

    const billingData: Faturamento = {
      ordem_servico_id: this.billingOsId(),
      valor_total: this.billingOsTotal(),
      status: 'Pendente', // Recalculado no backend
      parcelas: installments
    };

    this.apiService.createFaturamento(billingData).subscribe({
      next: () => {
        this.closeFaturarModal();
        this.loadAllData();
      },
      error: (err) => {
        console.error(err);
        this.billingErrors.set(err.error?.message || 'Erro ao gerar o faturamento.');
      }
    });
  }

  // Visualizar faturamento gerado
  viewFaturamento(osId: number): void {
    this.apiService.getFaturamentoByOs(osId).subscribe({
      next: (data) => {
        this.activeFaturamento.set(data);
        this.isModalVerFaturamentoOpen.set(true);
      },
      error: (err) => {
        console.error(err);
        alert('Esta OS ainda não possui faturamento gerado.');
      }
    });
  }

  closeVerFaturamentoModal(): void {
    this.isModalVerFaturamentoOpen.set(false);
  }

  // Quitar uma parcela do faturamento existente
  quitarParcela(parcelaId: number): void {
    if (confirm('Confirmar o recebimento desta parcela?')) {
      this.apiService.payParcela(parcelaId, {
        data_pagamento: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }).subscribe({
        next: () => {
          // Recarregar faturamento ativo exibido no modal
          const activeFat = this.activeFaturamento();
          if (activeFat) {
            this.apiService.getFaturamentoByOs(activeFat.ordem_servico_id).subscribe(data => {
              this.activeFaturamento.set(data);
              this.loadAllData(); // Recarrega OS da listagem geral
            });
          }
        },
        error: (err) => alert(err.error?.message || 'Erro ao pagar parcela.')
      });
    }
  }

  // Helpers
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

  getBillingStatusClass(status: string): string {
    switch (status) {
      case 'Pago': return 'badge-concluido';
      case 'Parcialmente Pago': return 'badge-aprovado';
      case 'Pendente': return 'badge-orcamento';
      case 'Cancelado': return 'badge-cancelado';
      default: return '';
    }
  }
}
