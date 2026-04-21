import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, getDocs, addDoc,
    updateDoc, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAgm7PskOIg8ORc_gUg_HRovnPBBrDFs-o",
    authDomain: "sapo-36f2f.firebaseapp.com",
    projectId: "sapo-36f2f",
    storageBucket: "sapo-36f2f.firebasestorage.app",
    messagingSenderId: "254535060020",
    appId: "1:254535060020:web:4685cfd4bc461f3ef89861"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const statusEl = document.getElementById('status-firebase');
let bdMedicos = [];
let bdCirurgias = [];

window.mudarAba = function(idAba) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(idAba).classList.add('active');
    document.getElementById(idAba.replace('aba-', 'btn-')).classList.add('active');
};

function iniciarListeners() {
    onSnapshot(collection(db, 'medicos'), (snapshot) => {
        bdMedicos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarMedicos();
        popularDropdownMedicos();
        statusEl.textContent = '🟢 Conectado';
        statusEl.classList.add('status-ok');
        document.getElementById('loading-medicos').style.display = 'none';
    }, (err) => {
        console.error(err);
        statusEl.textContent = '🔴 Erro de conexão';
        statusEl.classList.add('status-erro');
    });

    onSnapshot(collection(db, 'cirurgias'), (snapshot) => {
        bdCirurgias = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarCirurgias();
        popularDropdownCirurgias();
        document.getElementById('loading-cirurgias').style.display = 'none';
    });
}

function renderizarMedicos() {
    const lista = document.getElementById('lista-medicos');
    lista.innerHTML = '';
    if (bdMedicos.length === 0) {
        lista.innerHTML = '<p style="color:#718096;text-align:center;padding:20px;">Nenhum médico cadastrado.</p>';
        return;
    }
    bdMedicos.forEach((medico) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${medico.nome}</strong>
                ${medico.crm ? `<span style="color:#718096; font-size:0.85rem;"> — CRM: ${medico.crm}</span>` : ''}
            </div>
            <div class="acoes-lista">
                <button onclick="abrirModalMedico('${medico.id}')" title="Editar">✏️</button>
                <button onclick="excluirMedico('${medico.id}')" title="Excluir">🗑️</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function popularDropdownMedicos() {
    ['ind-medico', 'lote-medico'].forEach(id => {
        const sel = document.getElementById(id);
        const val = sel.value;
        sel.innerHTML = '<option value="">-- Sem médico --</option>';
        bdMedicos.forEach(m => {
            sel.innerHTML += `<option value="${m.id}">${m.nome}${m.crm ? ' (CRM: ' + m.crm + ')' : ''}</option>`;
        });
        sel.value = val;
    });
}

window.abrirModalMedico = function(id = null) {
    document.getElementById('medico-id').value = id || '';
    if (id) {
        const m = bdMedicos.find(x => x.id === id);
        document.getElementById('medico-nome').value = m.nome;
        document.getElementById('medico-crm').value = m.crm || '';
    } else {
        document.getElementById('medico-nome').value = '';
        document.getElementById('medico-crm').value = '';
    }
    document.getElementById('modal-medico').showModal();
};

window.salvarMedico = async function() {
    const id = document.getElementById('medico-id').value;
    const nome = document.getElementById('medico-nome').value.trim();
    const crm = document.getElementById('medico-crm').value.trim();
    if (!nome) return alert('Preencha o nome do médico!');

    try {
        if (id) {
            await updateDoc(doc(db, 'medicos', id), { nome, crm });
        } else {
            await addDoc(collection(db, 'medicos'), { nome, crm });
        }
        fecharModal('modal-medico');
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

window.excluirMedico = async function(id) {
    if (!confirm('Excluir este médico?')) return;
    await deleteDoc(doc(db, 'medicos', id));
};

function renderizarCirurgias() {
    const lista = document.getElementById('lista-cirurgias');
    lista.innerHTML = '';
    if (bdCirurgias.length === 0) {
        lista.innerHTML = '<p style="color:#718096;text-align:center;padding:20px;">Nenhuma cirurgia cadastrada.</p>';
        return;
    }
    bdCirurgias.forEach((cir) => {
        const total = (cir.exames || []).length;
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${cir.nome}</strong>
                <span style="color:#718096; font-size:0.85rem;"> — ${total} exame(s) vinculado(s)</span>
            </div>
            <div class="acoes-lista">
                <button onclick="abrirModalCirurgia('${cir.id}')" title="Editar">✏️</button>
                <button onclick="excluirCirurgia('${cir.id}')" title="Excluir">🗑️</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function popularDropdownCirurgias() {
    ['ind-cirurgia', 'lote-cirurgia'].forEach(id => {
        const sel = document.getElementById(id);
        const val = sel.value;
        sel.innerHTML = '<option value="">-- Selecione a cirurgia --</option>';
        bdCirurgias.forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
        sel.value = val;
    });
}

window.abrirModalCirurgia = function(id = null) {
    ['analises','raio','ultrassom','outros'].forEach(g => {
        document.getElementById('linhas-' + g).innerHTML = '';
    });
    document.getElementById('cirurgia-id').value = id || '';

    if (id) {
        const cir = bdCirurgias.find(x => x.id === id);
        document.getElementById('cirurgia-nome').value = cir.nome;
        (cir.exames || []).forEach(ex => adicionarLinhaExame(ex.grupo, ex.codigo, ex.nome));
    } else {
        document.getElementById('cirurgia-nome').value = '';
    }
    document.getElementById('modal-cirurgia').showModal();
};

window.adicionarLinhaExame = function(grupo = 'analises', codigo = '', nome = '') {
    const container = document.getElementById('linhas-' + grupo);
    const div = document.createElement('div');
    div.className = 'linha-exame';
    div.innerHTML = `
        <input type="text" class="exame-codigo" placeholder="Código" value="${codigo}" style="flex:1; min-width:80px;">
        <input type="text" class="exame-nome" placeholder="Nome do Exame" value="${nome}" style="flex:4;">
        <input type="hidden" class="exame-grupo" value="${grupo}">
        <button class="btn-remover" onclick="this.parentElement.remove()" title="Remover">✕</button>
    `;
    container.appendChild(div);
};

window.salvarCirurgia = async function() {
    const id = document.getElementById('cirurgia-id').value;
    const nome = document.getElementById('cirurgia-nome').value.trim();
    if (!nome) return alert('Dê um nome para a cirurgia!');

    const exames = [];
    document.querySelectorAll('.linha-exame').forEach(linha => {
        const grupo = linha.querySelector('.exame-grupo').value;
        const codigo = linha.querySelector('.exame-codigo').value.trim();
        const nomeEx = linha.querySelector('.exame-nome').value.trim();
        if (nomeEx) exames.push({ grupo, codigo, nome: nomeEx });
    });

    try {
        if (id) {
            await updateDoc(doc(db, 'cirurgias', id), { nome, exames });
        } else {
            await addDoc(collection(db, 'cirurgias'), { nome, exames });
        }
        fecharModal('modal-cirurgia');
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

window.excluirCirurgia = async function(id) {
    if (!confirm('Excluir esta cirurgia e seus exames?')) return;
    await deleteDoc(doc(db, 'cirurgias', id));
};

let pacientesLote = [];

document.getElementById('lote-arquivo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const dados = XLSX.utils.sheet_to_json(ws, { defval: '' });

        pacientesLote = dados.map(row => {
            const chaves = Object.keys(row);
            const getCol = (...nomes) => {
                for (const n of nomes) {
                    const found = chaves.find(k => k.toLowerCase().includes(n.toLowerCase()));
                    if (found) return String(row[found]).trim();
                }
                return '';
            };

            let dataNasc = getCol('nasc', 'nascimento', 'data');
            if (row[chaves.find(k => k.toLowerCase().includes('nasc') || k.toLowerCase().includes('data'))] instanceof Date) {
                const d = row[chaves.find(k => k.toLowerCase().includes('nasc') || k.toLowerCase().includes('data'))];
                dataNasc = d.toLocaleDateString('pt-BR');
            }

            return {
                matricula: getCol('matric', 'mat', 'cod', 'registro'),
                nome: getCol('nome', 'paciente', 'name'),
                dataNasc: dataNasc
            };
        }).filter(p => p.nome);

        const tbody = document.getElementById('tbody-preview');
        tbody.innerHTML = '';
        pacientesLote.forEach(p => {
            tbody.innerHTML += `<tr><td>${p.matricula}</td><td>${p.nome}</td><td>${p.dataNasc}</td></tr>`;
        });
        document.getElementById('lote-preview').style.display = 'block';
    };
    reader.readAsBinaryString(file);
});

function formatarData(valor) {
    if (!valor) return '';
    if (typeof valor === 'string' && valor.includes('-')) {
        const [y, m, d] = valor.split('-');
        return `${d}/${m}/${y}`;
    }
    return valor;
}

function calcularIdade(dataNasc) {
    if (!dataNasc) return 99; 
    let nasc;
    if (dataNasc.includes('-')) {
        const [y, m, d] = dataNasc.split('-');
        nasc = new Date(y, m - 1, d);
    } else {
        const [d, m, y] = dataNasc.split('/');
        nasc = new Date(y, m - 1, d);
    }
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}

function dispararImpressao(pdf) {
    const blob = pdf.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blob;
    document.body.appendChild(iframe);
    iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
    };
}

function gerarSADT(pdf, paciente, medico, exames, titulo, dataEmissao, imagemFundo) {
    const w = 210;
    const h = 297;
    pdf.addImage(imagemFundo, 'JPEG', 0, 0, w, h);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text(paciente.nome, 40, 64.2);
    pdf.text(paciente.matricula, 45, 59.2);
    pdf.text(formatarData(paciente.dataNasc), 120, 59.2);
    pdf.text(medico || '', 75, 147.2);
    pdf.text(dataEmissao, 121, 94);

    let yExame = 94;
    exames.forEach(ex => {
        const textoExame = `${ex.codigo ? ex.codigo + ' - ' : ''}${ex.nome}`;
        pdf.text(textoExame, 29.5, yExame);
        yExame += 5;
    });
}

function gerarAvaliacao(pdf, paciente, imagemFundo) {
    pdf.addImage(imagemFundo, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(paciente.nome, 35, 42);
    pdf.text(paciente.matricula, 169, 42);
    pdf.text(formatarData(paciente.dataNasc), 49, 51);
}

function gerarLembreteDoc(pdf, paciente, imagemFundo) {
    pdf.addImage(imagemFundo, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(paciente.nome, 12, 17);
    pdf.text(paciente.matricula, 12, 13);
}

async function gerarPDFPaciente(paciente, cirurgia, medico, dataEmissao) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    
    const idade = calcularIdade(paciente.dataNasc);
    const imgAvaliacaoPath = idade < 12 ? './img/avaliacao_infantil.jpg' : './img/avaliacao.jpg';

    const imgSadt = await carregarImagem('./img/sadt.jpg');
    const imgAvaliacao = await carregarImagem(imgAvaliacaoPath);
    const imgLembrete = await carregarImagem('./img/lembrete.jpg');

    let primeiraPagina = true;
    const addPage = () => {
        if (!primeiraPagina) pdf.addPage();
        primeiraPagina = false;
    };

    const exames = cirurgia.exames || [];
    const analises = exames.filter(e => e.grupo === 'analises');
    
    for (let j = 0; j < analises.length; j += 10) {
        addPage();
        gerarSADT(pdf, paciente, medico, analises.slice(j, j + 10), 'Análises Clínicas', dataEmissao, imgSadt);
    }

    const outrosGrupos = exames.filter(e => e.grupo !== 'analises');
    outrosGrupos.forEach(ex => {
        addPage();
        gerarSADT(pdf, paciente, medico, [ex], ex.grupo, dataEmissao, imgSadt);
    });

    addPage();
    gerarAvaliacao(pdf, paciente, imgAvaliacao);

    addPage();
    gerarLembreteDoc(pdf, paciente, imgLembrete);

    return pdf;
}

window.gerarPDFIndividual = async function() {
    const mat = document.getElementById('ind-mat').value.trim();
    const nome = document.getElementById('ind-nome').value.trim();
    const data = document.getElementById('ind-data').value;
    const cirId = document.getElementById('ind-cirurgia').value;
    const medId = document.getElementById('ind-medico').value;
    const emissao = document.getElementById('ind-emissao').value;

    if (!nome) return alert('Informe o nome do paciente!');
    if (!cirId) return alert('Selecione uma cirurgia!');

    const cirurgia = bdCirurgias.find(c => c.id === cirId);
    let medico = null;
    if (medId) {
        const objMedico = bdMedicos.find(m => m.id === medId);
        if (objMedico) {
            medico = objMedico.crm ? `${objMedico.nome} - CRM: ${objMedico.crm}` : objMedico.nome;
        }
    }

    const dataEmissao = emissao ? formatarData(emissao) : new Date().toLocaleDateString('pt-BR');
    const paciente = { matricula: mat, nome, dataNasc: data };

    const pdf = await gerarPDFPaciente(paciente, cirurgia, medico, dataEmissao);
    dispararImpressao(pdf);
};

window.processarLote = async function() {
    if (pacientesLote.length === 0) return alert('Carregue uma planilha primeiro!');
    const cirId = document.getElementById('lote-cirurgia').value;
    const medId = document.getElementById('lote-medico').value;
    const emissao = document.getElementById('lote-emissao').value;

    if (!cirId) return alert('Selecione uma cirurgia!');

    const cirurgia = bdCirurgias.find(c => c.id === cirId);
    let medico = null;
    if (medId) {
        const objMedico = bdMedicos.find(m => m.id === medId);
        if (objMedico) {
            medico = objMedico.crm ? `${objMedico.nome} - CRM: ${objMedico.crm}` : objMedico.nome;
        }
    }

    const dataEmissao = emissao ? formatarData(emissao) : new Date().toLocaleDateString('pt-BR');

    const modalProg = document.getElementById('modal-progresso');
    const barraFill = document.getElementById('barra-fill');
    const progressoTexto = document.getElementById('progresso-texto');
    modalProg.showModal();

    const imgSadt = await carregarImagem('./img/sadt.jpg');
    const imgAvaliacao = await carregarImagem('./img/avaliacao.jpg');
    const imgAvaliacaoInfantil = await carregarImagem('./img/avaliacao_infantil.jpg');
    const imgLembrete = await carregarImagem('./img/lembrete.jpg');

    const { jsPDF } = window.jspdf;
    const pdfFinal = new jsPDF({ unit: 'mm', format: 'a4' });
    let primeiroPaciente = true;

    for (let i = 0; i < pacientesLote.length; i++) {
        const p = pacientesLote[i];
        const pct = Math.round(((i + 1) / pacientesLote.length) * 100);
        barraFill.style.width = pct + '%';
        progressoTexto.textContent = `Processando ${i + 1} de ${pacientesLote.length}: ${p.nome}`;

        await new Promise(r => setTimeout(r, 10));

        const exames = cirurgia.exames || [];
        const analises = exames.filter(e => e.grupo === 'analises');
        const raios = exames.filter(e => e.grupo === 'raio');
        const ultrassons = exames.filter(e => e.grupo === 'ultrassom');
        const outros = exames.filter(e => e.grupo === 'outros');
        
        const idade = calcularIdade(p.dataNasc);
        const imgAvaliacaoUsar = idade < 12 ? imgAvaliacaoInfantil : imgAvaliacao;

        const addPag = (fn, ...args) => {
            if (!primeiroPaciente) pdfFinal.addPage();
            fn(pdfFinal, ...args);
            primeiroPaciente = false;
        };

        for (let j = 0; j < analises.length; j += 10) {
            addPag(gerarSADT, p, medico, analises.slice(j, j + 10), 'Análises Clínicas', dataEmissao, imgSadt);
        }
        
        raios.forEach(ex => addPag(gerarSADT, p, medico, [ex], 'Raio-X', dataEmissao, imgSadt));
        ultrassons.forEach(ex => addPag(gerarSADT, p, medico, [ex], 'Ultrassom', dataEmissao, imgSadt));
        outros.forEach(ex => addPag(gerarSADT, p, medico, [ex], 'Outros', dataEmissao, imgSadt));
        
        addPag(gerarAvaliacao, p, imgAvaliacaoUsar);
        addPag(gerarLembreteDoc, p, imgLembrete);
    }

    modalProg.close();
    dispararImpressao(pdfFinal);
};

window.fecharModal = function(idModal) {
    document.getElementById(idModal).close();
};

function setarDataHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('ind-emissao').value = hoje;
    document.getElementById('lote-emissao').value = hoje;
}

async function carregarImagem(caminho) {
    const response = await fetch(caminho);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

setarDataHoje();
iniciarListeners();