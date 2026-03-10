# ============================================================================
# FICHIER: api/management/commands/populate_database_complete.py
# ============================================================================

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Famille, Categorie, Materiel, Fournisseur, StockEntrepot

class Command(BaseCommand):
    help = 'Reset e popula Famílias, Categorias e Sub-categorias (Português)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset database antes de popular',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.reset_database()
        
        self.populate_database()

    def reset_database(self):
        """Limpa todos os dados"""
        self.stdout.write(self.style.WARNING('\n🗑️  RESET DATABASE...'))
        
        with transaction.atomic():
            # Ordem importante (foreign keys)
            count_stock = StockEntrepot.objects.count()
            StockEntrepot.objects.all().delete()
            self.stdout.write(f'  ✅ {count_stock} estoques deletados')
            
            count_mat = Materiel.objects.count()
            Materiel.objects.all().delete()
            self.stdout.write(f'  ✅ {count_mat} materiais deletados')
            
            count_cat = Categorie.objects.count()
            Categorie.objects.all().delete()
            self.stdout.write(f'  ✅ {count_cat} categorias deletadas')
            
            count_fam = Famille.objects.count()
            Famille.objects.all().delete()
            self.stdout.write(f'  ✅ {count_fam} famílias deletadas')
        
        self.stdout.write(self.style.SUCCESS('✅ Database resetada!\n'))

    def populate_database(self):
        """Popula Famílias, Categorias e Sub-categorias"""
        self.stdout.write(self.style.SUCCESS('🚀 POPULANDO DATABASE...'))
        
        with transaction.atomic():
            self.create_familles()
            self.create_categories()
        
        self.print_summary()

    def create_familles(self):
        """Cria as Famílias principais"""
        self.stdout.write(self.style.SUCCESS('\n📦 CRIANDO FAMÍLIAS...'))
        
        familles_data = [
            ('TUBULAÇÃO', 'Tubos, condutas e acessórios de transporte', '🔧', 1),
            ('CONEXÕES', 'Conexões, juntas e acessórios de ligação', '🔗', 2),
            ('VÁLVULAS_REGISTOS', 'Válvulas, registos e regulação de fluxo', '🚰', 3),
            ('BOMBAGEM', 'Bombas e equipamentos de bombeamento', '⚙️', 4),
            ('INSTRUMENTAÇÃO', 'Instrumentos de medição e controle', '📊', 5),
            ('ELETROMECÂNICA', 'Equipamentos eletromecânicos', '⚡', 6),
            ('SCADA_AUTOMAÇÃO', 'Sistemas SCADA e automação', '🖥️', 7),
            ('SEGURANÇA_EPI', 'Equipamentos de proteção individual', '🦺', 8),
            ('FERRAMENTAS', 'Ferramentas e utensílios', '🔨', 9),
            ('CABOS_ELETRICIDADE', 'Cabos elétricos e acessórios', '🔌', 10),
        ]
        
        self.familles = {}
        for nom, desc, icone, ordre in familles_data:
            famille, created = Famille.objects.get_or_create(
                nom=nom,
                defaults={
                    'description': desc,
                    'icone': icone,
                    'ordre': ordre
                }
            )
            self.familles[nom] = famille
            
            if created:
                self.stdout.write(f'  ✅ {icone} {nom}')
            else:
                self.stdout.write(self.style.WARNING(f'  ℹ️  {nom} já existe'))

    def create_categories(self):
        """Cria Categorias e Sub-categorias"""
        self.stdout.write(self.style.SUCCESS('\n📁 CRIANDO CATEGORIAS E SUB-CATEGORIAS...'))
        
        # ===================================================================
        # FAMÍLIA: TUBULAÇÃO
        # ===================================================================
        categories_tubulacao = [
            ('TUBOS_PEHD', 'Tubos PEHD (Polietileno de Alta Densidade)', [
                ('TUBO_PEHD_PE80', 'Tubo PEHD PE80'),
                ('TUBO_PEHD_PE100', 'Tubo PEHD PE100'),
            ]),
            ('TUBOS_PVC', 'Tubos PVC', [
                ('TUBO_PVC_PRESSAO', 'Tubo PVC sob pressão'),
                ('TUBO_PVC_ESGOTO', 'Tubo PVC para esgoto'),
            ]),
            ('TUBOS_METAL', 'Tubos metálicos', [
                ('TUBO_ACO', 'Tubo de aço'),
                ('TUBO_FERRO_FUNDIDO', 'Tubo de ferro fundido'),
                ('TUBO_ACO_INOX', 'Tubo de aço inoxidável'),
            ]),
            ('ADUÇÃO', 'Condutas de adução', []),
            ('DISTRIBUIÇÃO', 'Condutas de distribuição', []),
        ]
        
        self.create_category_tree('TUBULAÇÃO', categories_tubulacao)
        
        # ===================================================================
        # FAMÍLIA: CONEXÕES
        # ===================================================================
        categories_conexoes = [
            ('COTOVELOS', 'Cotovelos e curvas', [
                ('COTOVELO_90', 'Cotovelo 90°'),
                ('COTOVELO_45', 'Cotovelo 45°'),
            ]),
            ('TÊS', 'Tês e derivações', [
                ('TE_IGUAL', 'Tê igual'),
                ('TE_REDUCAO', 'Tê de redução'),
            ]),
            ('REDUÇÕES', 'Reduções e transições', [
                ('REDUCAO_CONCENTRICA', 'Redução concêntrica'),
                ('REDUCAO_EXCENTRICA', 'Redução excêntrica'),
            ]),
            ('FLANGES', 'Flanges e contra-flanges', []),
            ('JUNTAS', 'Juntas de vedação', [
                ('JUNTA_BORRACHA', 'Junta de borracha'),
                ('JUNTA_MECANICA', 'Junta mecânica'),
            ]),
            ('BRAÇADEIRAS', 'Braçadeiras e colares', []),
        ]
        
        self.create_category_tree('CONEXÕES', categories_conexoes)
        
        # ===================================================================
        # FAMÍLIA: VÁLVULAS E REGISTOS
        # ===================================================================
        categories_valvulas = [
            ('VÁLVULAS_CORTE', 'Válvulas de corte', [
                ('VALVULA_GAVETA', 'Válvula de gaveta'),
                ('VALVULA_BORBOLETA', 'Válvula borboleta'),
            ]),
            ('VÁLVULAS_REGULACAO', 'Válvulas de regulação', [
                ('VALVULA_AGULHA', 'Válvula de agulha'),
                ('VALVULA_GLOBO', 'Válvula de globo'),
            ]),
            ('VENTOSAS', 'Ventosas e purgadores', [
                ('VENTOSA_SIMPLES', 'Ventosa simples'),
                ('VENTOSA_DUPLA', 'Ventosa dupla efeito'),
            ]),
            ('HIDRANTES', 'Hidrantes e bocas de incêndio', []),
            ('VÁLVULAS_RETENCAO', 'Válvulas de retenção', [
                ('VALVULA_PE_DISCO', 'Válvula de retenção de disco'),
                ('VALVULA_PE_PORTINHOLA', 'Válvula de retenção de portinhola'),
            ]),
        ]
        
        self.create_category_tree('VÁLVULAS_REGISTOS', categories_valvulas)
        
        # ===================================================================
        # FAMÍLIA: BOMBAGEM
        # ===================================================================
        categories_bombagem = [
            ('BOMBAS_SUBMERSÍVEIS', 'Bombas submersíveis', [
                ('BOMBA_FURO', 'Bomba de furo'),
                ('BOMBA_ESGOTO', 'Bomba de esgoto'),
            ]),
            ('BOMBAS_SUPERFÍCIE', 'Bombas de superfície', [
                ('BOMBA_CENTRIFUGA', 'Bomba centrífuga'),
                ('BOMBA_PERIFERICA', 'Bomba periférica'),
            ]),
            ('ELETROBOMBAS', 'Eletrobombas', []),
            ('ACESSÓRIOS_BOMBA', 'Acessórios de bombeamento', [
                ('QUADRO_COMANDO', 'Quadro de comando'),
                ('PRESSOSTATO', 'Pressostato'),
            ]),
        ]
        
        self.create_category_tree('BOMBAGEM', categories_bombagem)
        
        # ===================================================================
        # FAMÍLIA: INSTRUMENTAÇÃO
        # ===================================================================
        categories_instrumentacao = [
            ('CONTADORES', 'Contadores de água', [
                ('CONTADOR_MECANICO', 'Contador mecânico'),
                ('CONTADOR_ELETRONICO', 'Contador eletrônico'),
            ]),
            ('MEDIDORES_VAZAO', 'Medidores de vazão', [
                ('MEDIDOR_ELETROMAGNETICO', 'Medidor eletromagnético'),
                ('MEDIDOR_ULTRASONICO', 'Medidor ultrassônico'),
            ]),
            ('MANÔMETROS', 'Manômetros e medidores de pressão', []),
            ('SENSORES_PRESSAO', 'Sensores de pressão', []),
            ('SENSORES_NIVEL', 'Sensores de nível', []),
            ('ANALISADORES_QUALIDADE', 'Analisadores de qualidade de água', [
                ('ANALISADOR_CLORO', 'Analisador de cloro'),
                ('ANALISADOR_PH', 'Analisador de pH'),
            ]),
        ]
        
        self.create_category_tree('INSTRUMENTAÇÃO', categories_instrumentacao)
        
        # ===================================================================
        # FAMÍLIA: ELETROMECÂNICA
        # ===================================================================
        categories_eletro = [
            ('MOTORES_ELETRICOS', 'Motores elétricos', []),
            ('QUADROS_ELETRICOS', 'Quadros elétricos', []),
            ('PAINEIS_COMANDO', 'Painéis de comando', []),
            ('CONTATORES_RELES', 'Contatores e relés', []),
        ]
        
        self.create_category_tree('ELETROMECÂNICA', categories_eletro)
        
        # ===================================================================
        # FAMÍLIA: SCADA & AUTOMAÇÃO
        # ===================================================================
        categories_scada = [
            ('AUTOMATOS_PLC', 'Autômatos programáveis (PLC)', []),
            ('SISTEMAS_SUPERVISAO', 'Sistemas de supervisão', []),
            ('EQUIPAMENTOS_COMUNICACAO', 'Equipamentos de comunicação', [
                ('MODEM_INDUSTRIAL', 'Modem industrial'),
                ('ROUTER_INDUSTRIAL', 'Router industrial'),
            ]),
            ('DETECTORES_FUGA', 'Detectores de fuga', []),
        ]
        
        self.create_category_tree('SCADA_AUTOMAÇÃO', categories_scada)
        
        # ===================================================================
        # FAMÍLIA: SEGURANÇA & EPI
        # ===================================================================
        categories_seguranca = [
            ('CAPACETES', 'Capacetes de segurança', []),
            ('LUVAS', 'Luvas de proteção', []),
            ('CALCADO_SEGURANCA', 'Calçado de segurança', []),
            ('ARNESES', 'Arneses de segurança', []),
        ]
        
        self.create_category_tree('SEGURANÇA_EPI', categories_seguranca)
        
        # ===================================================================
        # FAMÍLIA: FERRAMENTAS
        # ===================================================================
        categories_ferramentas = [
            ('CHAVES', 'Chaves (fixas, ajustáveis, etc.)', []),
            ('ALICATES', 'Alicates diversos', []),
            ('BERBEQUINS', 'Berbequins e aparafusadoras', []),
            ('EQUIPAMENTO_SOLDADURA', 'Equipamento de soldadura', []),
        ]
        
        self.create_category_tree('FERRAMENTAS', categories_ferramentas)
        
        # ===================================================================
        # FAMÍLIA: CABOS & ELETRICIDADE
        # ===================================================================
        categories_cabos = [
            ('CABOS_ELETRICOS', 'Cabos elétricos', [
                ('CABO_COBRE', 'Cabo de cobre'),
                ('CABO_ALUMINIO', 'Cabo de alumínio'),
            ]),
            ('CALHAS_CABOS', 'Calhas para cabos', []),
            ('BORNES_LIGACAO', 'Bornes de ligação', []),
        ]
        
        self.create_category_tree('CABOS_ELETRICIDADE', categories_cabos)

    def create_category_tree(self, famille_nom, categories_data):
        """Cria árvore de categorias para uma família"""
        famille = self.familles.get(famille_nom)
        if not famille:
            self.stdout.write(self.style.ERROR(f'  ❌ Família {famille_nom} não encontrada!'))
            return
        
        for cat_nom, cat_desc, sous_cats in categories_data:
            # Criar categoria principal
            cat, created = Categorie.objects.get_or_create(
                famille=famille,
                nom=cat_nom,
                parent=None,
                defaults={'description': cat_desc}
            )
            
            if created:
                self.stdout.write(f'  ✅ {famille_nom} → {cat_nom}')
            
            # Criar sub-categorias
            for sous_nom, sous_desc in sous_cats:
                sous_cat, created = Categorie.objects.get_or_create(
                    famille=famille,
                    nom=sous_nom,
                    parent=cat,
                    defaults={'description': sous_desc}
                )
                
                if created:
                    self.stdout.write(f'    ✅ {cat_nom} → {sous_nom}')

    def print_summary(self):
        """Imprime resumo"""
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✅ DATABASE POPULADA COM SUCESSO!'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'📦 Total Famílias: {Famille.objects.count()}')
        self.stdout.write(f'📁 Total Categorias Principais: {Categorie.objects.filter(parent__isnull=True).count()}')
        self.stdout.write(f'📄 Total Sub-categorias: {Categorie.objects.filter(parent__isnull=False).count()}')
        self.stdout.write(f'📊 TOTAL CATEGORIAS: {Categorie.objects.count()}')
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))