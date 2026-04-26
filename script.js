import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, getDocs, addDoc, setDoc,
    updateDoc, deleteDoc, doc, onSnapshot, getDoc, writeBatch
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
                <button onclick="abrirModalMedico('${medico.id}')">✏️</button>
                <button onclick="excluirMedico('${medico.id}')">🗑️</button>
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
        if (id) await updateDoc(doc(db, 'medicos', id), { nome, crm });
        else await addDoc(collection(db, 'medicos'), { nome, crm });
        fecharModal('modal-medico');
    } catch (e) { alert('Erro ao salvar.'); }
};

window.excluirMedico = async function(id) {
    if (confirm('Excluir este médico?')) await deleteDoc(doc(db, 'medicos', id));
};

function renderizarCirurgias() {
    const lista = document.getElementById('lista-cirurgias');
    lista.innerHTML = '';
    const cirurgiasValidas = bdCirurgias.filter(c => c.id !== 'METADADOS_BASE');
    if (cirurgiasValidas.length === 0) {
        lista.innerHTML = '<p style="color:#718096;text-align:center;padding:20px;">Nenhuma cirurgia cadastrada.</p>';
        return;
    }
    cirurgiasValidas.forEach((cir) => {
        const total = (cir.exames || []).length;
        const li = document.createElement('li');
        li.innerHTML = `
            <div><strong>${cir.nome}</strong><span style="color:#718096; font-size:0.85rem;"> — ${total} exames</span></div>
            <div class="acoes-lista">
                <button onclick="abrirModalCirurgia('${cir.id}')">✏️</button>
                <button onclick="excluirCirurgia('${cir.id}')">🗑️</button>
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
            if (c.id === 'METADADOS_BASE') return;
            sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
        sel.value = val;
    });
}

window.abrirModalCirurgia = function(id = null) {
    ['analises','raio','ultrassom','outros'].forEach(g => document.getElementById('linhas-' + g).innerHTML = '');
    document.getElementById('cirurgia-id').value = id || '';
    if (id) {
        const cir = bdCirurgias.find(x => x.id === id);
        document.getElementById('cirurgia-nome').value = cir.nome;
        (cir.exames || []).forEach(ex => adicionarLinhaExame(ex.grupo, ex.codigo, ex.nome));
    } else document.getElementById('cirurgia-nome').value = '';
    document.getElementById('modal-cirurgia').showModal();
};

window.adicionarLinhaExame = function(grupo = 'analises', codigo = '', nome = '') {
    const container = document.getElementById('linhas-' + grupo);
    const div = document.createElement('div');
    div.className = 'linha-exame';
    div.innerHTML = `<input type="text" class="exame-codigo" placeholder="Cód" value="${codigo}" style="width:80px;"><input type="text" class="exame-nome" placeholder="Exame" value="${nome}" style="flex:1;"><input type="hidden" class="exame-grupo" value="${grupo}"><button onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(div);
};

window.salvarCirurgia = async function() {
    const id = document.getElementById('cirurgia-id').value;
    const nome = document.getElementById('cirurgia-nome').value.trim();
    if (!nome) return alert('Dê um nome!');
    const exames = [];
    document.querySelectorAll('.linha-exame').forEach(l => {
        const grupo = l.querySelector('.exame-grupo').value;
        const codigo = l.querySelector('.exame-codigo').value.trim();
        const nomeEx = l.querySelector('.exame-nome').value.trim();
        if (nomeEx) exames.push({ grupo, codigo, nome: nomeEx });
    });
    try {
        if (id) await updateDoc(doc(db, 'cirurgias', id), { nome, exames });
        else await addDoc(collection(db, 'cirurgias'), { nome, exames });
        fecharModal('modal-cirurgia');
    } catch (e) { alert('Erro ao salvar.'); }
};

window.excluirCirurgia = async function(id) {
    if (confirm('Excluir esta cirurgia?')) await deleteDoc(doc(db, 'cirurgias', id));
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
            let dataNasc = getCol('nasc', 'data');
            if (row[chaves.find(k => k.toLowerCase().includes('nasc') || k.toLowerCase().includes('data'))] instanceof Date) {
                dataNasc = row[chaves.find(k => k.toLowerCase().includes('nasc') || k.toLowerCase().includes('data'))].toLocaleDateString('pt-BR');
            }
            return { matricula: getCol('matric', 'mat', 'cod'), nome: getCol('nome', 'paciente'), dataNasc };
        }).filter(p => p.nome);
        const tbody = document.getElementById('tbody-preview');
        tbody.innerHTML = '';
        pacientesLote.forEach(p => tbody.innerHTML += `<tr><td>${p.matricula}</td><td>${p.nome}</td><td>${p.dataNasc}</td></tr>`);
        document.getElementById('lote-preview').style.display = 'block';
    };
    reader.readAsBinaryString(file);
});

window.abrirModalConfig = function() {
    document.getElementById('modal-config').showModal();
    atualizarContagemPacientes();
};

async function atualizarContagemPacientes() {
    const el = document.getElementById('contagem-pacientes');
    try {
        const docSnap = await getDoc(doc(db, 'cirurgias', 'METADADOS_BASE'));
        if (docSnap.exists()) {
            const d = docSnap.data();
            el.textContent = `📊 Última carga: ${d.ultimoEnvio} pacientes em ${d.dataEnvio}`;
        } else {
            el.textContent = "📊 Nenhuma base registrada ainda.";
        }
    } catch (err) { el.textContent = "📊 Erro ao ler dados."; }
}

window.subirBasePacientes = async function() {
    const fileInput = document.getElementById('arquivo-nuvem-pacientes');
    const file = fileInput.files[0];
    if (!file) return alert('Selecione uma planilha!');
    const btn = document.getElementById('btn-subir-base');
    btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const dados = XLSX.utils.sheet_to_json(ws, { defval: '' });
            let batch = writeBatch(db);
            let count = 0;
            let total = 0;
            for (const row of dados) {
                const chaves = Object.keys(row);
                const getCol = (...n) => { for (const name of n) { const f = chaves.find(k => k.toLowerCase().includes(name.toLowerCase())); if (f) return String(row[f]).trim(); } return ''; };
                const matricula = String(getCol('matric', 'mat')).replace(/\D/g, '');
                const nome = getCol('nome', 'paciente');
                let dataNasc = getCol('nasc', 'data');
                if (!matricula || !nome) continue;
                if (row[chaves.find(k => k.toLowerCase().includes('nasc'))] instanceof Date) dataNasc = row[chaves.find(k => k.toLowerCase().includes('nasc'))].toISOString().split('T')[0];
                else if (dataNasc.includes('/')) { const p = dataNasc.split('/'); dataNasc = `${p[2]}-${p[1]}-${p[0]}`; }
                batch.set(doc(db, 'pacientes', matricula), { nome, dataNasc });
                count++;
                total++;
                if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
            }
            if (count > 0) await batch.commit();
            await setDoc(doc(db, 'cirurgias', 'METADADOS_BASE'), {
                ultimoEnvio: total,
                dataEnvio: new Date().toLocaleDateString('pt-BR')
            });
            alert('Base atualizada!');
            atualizarContagemPacientes();
            fecharModal('modal-config');
        } catch (e) { alert('Erro ao subir.'); }
        finally { btn.disabled = false; }
    };
    reader.readAsBinaryString(file);
};

let timerBuscaMatricula;
document.getElementById('ind-mat').addEventListener('input', function(e) {
    const matricula = e.target.value.replace(/\D/g, '');
    if (matricula.length < 3) return;
    clearTimeout(timerBuscaMatricula);
    timerBuscaMatricula = setTimeout(async () => {
        try {
            const docSnap = await getDoc(doc(db, 'pacientes', matricula));
            if (docSnap.exists()) {
                const d = docSnap.data();
                document.getElementById('ind-nome').value = d.nome;
                if (d.dataNasc) document.getElementById('ind-data').value = d.dataNasc;
            }
        } catch(err) {}
    }, 600);
});

function formatarData(v) { if (!v) return ''; if (typeof v === 'string' && v.includes('-')) { const [y, m, d] = v.split('-'); return `${d}/${m}/${y}`; } return v; }

function calcularIdade(data) {
    if (!data) return 99;
    let n;
    if (data.includes('-')) { const [y, m, d] = data.split('-'); n = new Date(y, m-1, d); }
    else { const [d, m, y] = data.split('/'); n = new Date(y, m-1, d); }
    const h = new Date();
    let i = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) i--;
    return i;
}

function dispararImpressao(pdf) {
    const blob = pdf.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blob;
    document.body.appendChild(iframe);
    iframe.onload = () => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000); };
}

function gerarSADT(pdf, p, m, exames, t, dEmissao, img) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(p.nome, 40, 64.2);
    pdf.text(p.matricula, 45, 59.2);
    pdf.text(formatarData(p.dataNasc), 120, 59.2);
    pdf.text(m || '', 75, 147.2);
    pdf.text(dEmissao, 121, 94);
    let y = 94;
    exames.forEach(ex => { pdf.text(`${ex.codigo ? ex.codigo + ' - ' : ''}${ex.nome}`, 29.5, y); y += 5; });
}

function gerarAvaliacao(pdf, p, img, ehI) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    if (ehI) { pdf.text(p.nome, 37.5, 48.5); pdf.text(p.matricula, 164, 48.5); pdf.text(formatarData(p.dataNasc), 54, 56.5)}
    else { pdf.text(p.nome, 35, 42); pdf.text(p.matricula, 169, 42); pdf.text(formatarData(p.dataNasc), 49, 51); }
}

function gerarLembreteDoc(pdf, p, img) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(p.nome, 12, 18);
    pdf.text(p.matricula, 12, 14);
}

async function gerarPDFPaciente(p, cir, med, dEmissao) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const idade = calcularIdade(p.dataNasc);
    const ehI = idade < 12;
    const imgS = await carregarImagem('./img/sadt.jpg');
    const imgA = await carregarImagem(ehI ? './img/avaliacao_infantil.jpg' : './img/avaliacao.jpg');
    const imgL = await carregarImagem('./img/lembrete.jpg');
    let first = true;
    const addP = () => { if (!first) pdf.addPage(); first = false; };
    const analises = (cir.exames || []).filter(e => e.grupo === 'analises');
    for (let j = 0; j < analises.length; j += 10) { addP(); gerarSADT(pdf, p, med, analises.slice(j, j + 10), '', dEmissao, imgS); }
    (cir.exames || []).filter(e => e.grupo !== 'analises').forEach(ex => { addP(); gerarSADT(pdf, p, med, [ex], '', dEmissao, imgS); });
    addP(); gerarAvaliacao(pdf, p, imgA, ehI);
    addP(); gerarLembreteDoc(pdf, p, imgL);
    return pdf;
}

window.gerarPDFIndividual = async function() {
    const n = document.getElementById('ind-nome').value.trim();
    const cId = document.getElementById('ind-cirurgia').value;
    if (!n || !cId) return alert('Preencha os dados!');
    const cir = bdCirurgias.find(c => c.id === cId);
    let med = null;
    const mId = document.getElementById('ind-medico').value;
    if (mId) { const oM = bdMedicos.find(m => m.id === mId); if (oM) med = oM.crm ? `${oM.nome} - CRM: ${oM.crm}` : oM.nome; }
    const dE = document.getElementById('ind-emissao').value ? formatarData(document.getElementById('ind-emissao').value) : new Date().toLocaleDateString('pt-BR');
    const p = { matricula: document.getElementById('ind-mat').value.trim(), nome: n, dataNasc: document.getElementById('ind-data').value };
    const pdf = await gerarPDFPaciente(p, cir, med, dE);
    dispararImpressao(pdf);
};

window.processarLote = async function() {
    if (pacientesLote.length === 0) return alert('Carregue a planilha!');
    const cId = document.getElementById('lote-cirurgia').value;
    if (!cId) return alert('Selecione a cirurgia!');
    const cir = bdCirurgias.find(c => c.id === cId);
    let med = null;
    const mId = document.getElementById('lote-medico').value;
    if (mId) { const oM = bdMedicos.find(m => m.id === mId); if (oM) med = oM.crm ? `${oM.nome} - CRM: ${oM.crm}` : oM.nome; }
    const dE = document.getElementById('lote-emissao').value ? formatarData(document.getElementById('lote-emissao').value) : new Date().toLocaleDateString('pt-BR');
    const modalProg = document.getElementById('modal-progresso');
    const bFill = document.getElementById('barra-fill');
    modalProg.showModal();
    const imgS = await carregarImagem('./img/sadt.jpg');
    const imgA = await carregarImagem('./img/avaliacao.jpg');
    const imgAI = await carregarImagem('./img/avaliacao_infantil.jpg');
    const imgL = await carregarImagem('./img/lembrete.jpg');
    const { jsPDF } = window.jspdf;
    const pdfFinal = new jsPDF({ unit: 'mm', format: 'a4' });
    let first = true;
    for (let i = 0; i < pacientesLote.length; i++) {
        const p = pacientesLote[i];
        bFill.style.width = Math.round(((i + 1) / pacientesLote.length) * 100) + '%';
        await new Promise(r => setTimeout(r, 10));
        const analises = (cir.exames || []).filter(e => e.grupo === 'analises');
        const ehI = calcularIdade(p.dataNasc) < 12;
        const addPag = (fn, ...args) => { if (!first) pdfFinal.addPage(); fn(pdfFinal, ...args); first = false; };
        for (let j = 0; j < analises.length; j += 10) { addPag(gerarSADT, p, med, analises.slice(j, j + 10), '', dE, imgS); }
        (cir.exames || []).filter(e => e.grupo !== 'analises').forEach(ex => { addPag(gerarSADT, p, med, [ex], '', dE, imgS); });
        addPag(gerarAvaliacao, p, ehI ? imgAI : imgA, ehI);
        addPag(gerarLembreteDoc, p, imgL);
    }
    modalProg.close();
    dispararImpressao(pdfFinal);
};

window.fecharModal = function(id) { document.getElementById(id).close(); };
function setarDataHoje() { const h = new Date().toISOString().split('T')[0]; document.getElementById('ind-emissao').value = h; document.getElementById('lote-emissao').value = h; }
async function carregarImagem(c) { const r = await fetch(c); const b = await r.blob(); return new Promise((res) => { const reader = new FileReader(); reader.onloadend = () => res(reader.result); reader.readAsDataURL(b); }); }
setarDataHoje();
iniciarListeners();