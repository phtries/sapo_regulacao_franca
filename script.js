import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, getDocs, addDoc, setDoc, query, where,
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
let variavelAno = new Date().getFullYear().toString();
let horarioAzul = "07:45";
let medicoAzulId = "";
let horarioVermelho = "15:30";
let medicoVermelhoId = "";

function getHojeLocal() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

window.mudarAba = function(idAba) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(idAba).classList.add('active');
    const btn = document.getElementById(idAba.replace('aba-', 'btn-'));
    if(btn) btn.classList.add('active');
};

function mostrarToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function extrairDadosDaLinha(row) {
    const chaves = Object.keys(row);
    const getCol = (...nomes) => {
        for (const n of nomes) {
            const f = chaves.find(k => k && typeof k === 'string' && k.toLowerCase().includes(n.toLowerCase()));
            if (f) return String(row[f]).trim();
        }
        return '';
    };

    let matricula = String(getCol('matric', 'mat', 'cod')).replace(/\D/g, '');
    let nome = getCol('nome', 'paciente');
    let cross = getCol('cross');
    let dataNasc = getCol('nasc', 'data', 'nascimento');

    const keyNasc = chaves.find(k => k && typeof k === 'string' && (k.toLowerCase().includes('nasc') || k.toLowerCase().includes('data')));
    if (keyNasc && row[keyNasc] instanceof Date) {
        dataNasc = row[keyNasc].toISOString().split('T')[0];
    } else if (keyNasc && typeof row[keyNasc] === 'number') {
        const d = new Date(Math.round((row[keyNasc] - 25569) * 86400 * 1000));
        dataNasc = d.toISOString().split('T')[0];
    } else if (dataNasc.includes('/')) {
        const partes = dataNasc.split('/');
        if (partes.length === 3) dataNasc = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    
    return { matricula, nome, dataNasc, cross };
}

function aplicarTurnoSelecionado(valor) {
    const turno = valor === 'vermelho' ? 'vermelho' : 'azul';

    ['ind', 'lote'].forEach(prefixo => {
        const azul = document.getElementById(`${prefixo}-turno-azul`);
        const vermelho = document.getElementById(`${prefixo}-turno-vermelho`);
        const toggle = document.getElementById(`${prefixo}-turno-toggle`);

        if (azul) azul.checked = turno === 'azul';
        if (vermelho) vermelho.checked = turno === 'vermelho';

        if (toggle) {
            toggle.classList.toggle('selecionado-azul', turno === 'azul');
            toggle.classList.toggle('selecionado-vermelho', turno === 'vermelho');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ultimoTurno = localStorage.getItem('sapo_ultimo_turno') || 'azul';
    aplicarTurnoSelecionado(ultimoTurno);

    document.addEventListener('change', (e) => {
        if(e.target.name === 'ind_turno' || e.target.name === 'lote_turno') {
            const val = e.target.value;
            localStorage.setItem('sapo_ultimo_turno', val);
            aplicarTurnoSelecionado(val);
        }
    });
});

function iniciarListeners() {
    onSnapshot(collection(db, 'medicos'), (snapshot) => {
        bdMedicos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarMedicos();
        popularDropdownMedicos();
        statusEl.textContent = '🟢 Conectado';
        statusEl.classList.add('status-ok');
        document.getElementById('loading-medicos').style.display = 'none';
    }, () => {
        statusEl.textContent = '🔴 Erro de conexão';
        statusEl.classList.add('status-erro');
    });

    onSnapshot(collection(db, 'cirurgias'), (snapshot) => {
        bdCirurgias = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarCirurgias();
        popularDropdownCirurgias();
        document.getElementById('loading-cirurgias').style.display = 'none';
        const meta = bdCirurgias.find(c => c.id === 'METADADOS_BASE');
        if (meta) {
            if (meta.ano) variavelAno = meta.ano;
            if (meta.horarioAzul) horarioAzul = meta.horarioAzul;
            if (meta.medicoAzulId) medicoAzulId = meta.medicoAzulId;
            if (meta.horarioVermelho) horarioVermelho = meta.horarioVermelho;
            if (meta.medicoVermelhoId) medicoVermelhoId = meta.medicoVermelhoId;
        }
    });
}

function renderizarMedicos() {
    const lista = document.getElementById('lista-medicos');
    lista.innerHTML = '';
    if (bdMedicos.length === 0) return lista.innerHTML = '<p style="color:#718096;text-align:center;padding:20px;">Nenhum médico cadastrado.</p>';
    const medicosOrdenados = [...bdMedicos].sort((a, b) => a.nome.localeCompare(b.nome));
    medicosOrdenados.forEach((medico) => {
        const li = document.createElement('li');
        li.innerHTML = `<div><strong>${medico.nome}</strong>${medico.crm ? `<span style="color:#718096; font-size:0.85rem;"> — CRM: ${medico.crm}</span>` : ''}</div>
            <div class="acoes-lista"><button onclick="abrirModalMedico('${medico.id}')">✏️</button><button onclick="excluirMedico('${medico.id}')">🗑️</button></div>`;
        lista.appendChild(li);
    });
}

function popularDropdownMedicos() {
    ['ind-medico', 'lote-medico', 'config-med-azul', 'config-med-vermelho'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const val = sel.value;
        sel.innerHTML = id.startsWith('config') ? '<option value="">-- Selecione o médico --</option>' : '<option value="">-- Sem médico --</option>';
        const medicosOrdenados = [...bdMedicos].sort((a, b) => a.nome.localeCompare(b.nome));
        medicosOrdenados.forEach(m => sel.innerHTML += `<option value="${m.id}">${m.nome}${(!id.startsWith('config') && m.crm) ? ' (CRM: ' + m.crm + ')' : ''}</option>`);
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
    if (!nome) return mostrarToast('Preencha o nome do médico!');
    try {
        if (id) await updateDoc(doc(db, 'medicos', id), { nome, crm });
        else await addDoc(collection(db, 'medicos'), { nome, crm });
        fecharModal('modal-medico');
        mostrarToast('Médico salvo!');
    } catch (e) { mostrarToast('Erro ao salvar.'); }
};

window.excluirMedico = async function(id) {
    if (confirm('Excluir este médico?')) await deleteDoc(doc(db, 'medicos', id));
};

function renderizarCirurgias() {
    const lista = document.getElementById('lista-cirurgias');
    lista.innerHTML = '';
    const cirurgiasValidas = bdCirurgias.filter(c => c.id !== 'METADADOS_BASE').sort((a, b) => a.nome.localeCompare(b.nome));
    if (cirurgiasValidas.length === 0) return lista.innerHTML = '<p style="color:#718096;text-align:center;padding:20px;">Nenhum grupo cadastrado.</p>';
    cirurgiasValidas.forEach((cir) => {
        const li = document.createElement('li');
        li.innerHTML = `<div><strong>${cir.nome}</strong><span style="color:#718096; font-size:0.85rem;"> — ${(cir.exames || []).length} exames ${cir.apenasExames ? '(Apenas Exames)' : ''}</span></div>
            <div class="acoes-lista"><button onclick="abrirModalCirurgia('${cir.id}')">✏️</button><button onclick="excluirCirurgia('${cir.id}')">🗑️</button></div>`;
        lista.appendChild(li);
    });
}

function popularDropdownCirurgias() {
    ['ind-cirurgia', 'lote-cirurgia'].forEach(id => {
        const sel = document.getElementById(id);
        const val = sel.value;
        sel.innerHTML = '<option value="">-- Selecione o grupo --</option>';
        const cirurgiasOrdenadas = bdCirurgias.filter(c => c.id !== 'METADADOS_BASE').sort((a, b) => a.nome.localeCompare(b.nome));
        cirurgiasOrdenadas.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
        sel.value = val;
    });
}

document.getElementById('ind-cirurgia').addEventListener('change', function() {
    const txt = this.options[this.selectedIndex].text;
    document.getElementById('ind-proposta').value = txt !== '-- Selecione o grupo --' ? txt : '';
});
document.getElementById('lote-cirurgia').addEventListener('change', function() {
    const txt = this.options[this.selectedIndex].text;
    document.getElementById('lote-proposta').value = txt !== '-- Selecione o grupo --' ? txt : '';
});

window.abrirModalCirurgia = function(id = null) {
    ['analises','raio','ultrassom','outros'].forEach(g => document.getElementById('linhas-' + g).innerHTML = '');
    document.getElementById('cirurgia-id').value = id || '';
    if (id) {
        const cir = bdCirurgias.find(x => x.id === id);
        document.getElementById('cirurgia-nome').value = cir.nome;
        document.getElementById('cirurgia-apenas-exames').checked = cir.apenasExames || false;
        (cir.exames || []).forEach(ex => adicionarLinhaExame(ex.grupo, ex.codigo, ex.nome));
    } else {
        document.getElementById('cirurgia-nome').value = '';
        document.getElementById('cirurgia-apenas-exames').checked = false;
    }
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
    const apenasExames = document.getElementById('cirurgia-apenas-exames').checked;
    if (!nome) return mostrarToast('Dê um nome!');
    const exames = [];
    document.querySelectorAll('.linha-exame').forEach(l => {
        const nomeEx = l.querySelector('.exame-nome').value.trim();
        if (nomeEx) exames.push({ grupo: l.querySelector('.exame-grupo').value, codigo: l.querySelector('.exame-codigo').value.trim(), nome: nomeEx });
    });
    try {
        if (id) await updateDoc(doc(db, 'cirurgias', id), { nome, exames, apenasExames });
        else await addDoc(collection(db, 'cirurgias'), { nome, exames, apenasExames });
        fecharModal('modal-cirurgia');
        mostrarToast('Grupo salvo!');
    } catch (e) { mostrarToast('Erro ao salvar.'); }
};

window.excluirCirurgia = async function(id) {
    if (confirm('Excluir este grupo?')) await deleteDoc(doc(db, 'cirurgias', id));
};

let pacientesLote = [];
document.getElementById('lote-arquivo').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true });
            const dados = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            
            const tbody = document.getElementById('tbody-preview');
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">⏳ Buscando dados do paciente...</td></tr>';
            document.getElementById('lote-preview').style.display = 'block';

            pacientesLote = [];
            
            for (const row of dados) {
                let { matricula, nome, dataNasc, cross } = extrairDadosDaLinha(row);
                if (!matricula) continue;
                
                if (!nome || !dataNasc || !cross) {
                    try {
                        const docSnap = await getDoc(doc(db, 'pacientes', matricula));
                        if (docSnap.exists()) {
                            const d = docSnap.data();
                            if (!nome) nome = d.nome || '';
                            if (!dataNasc) dataNasc = d.dataNasc || '';
                            if (!cross) cross = d.cross || '';
                        }
                    } catch(err) {}
                }

                if (nome) pacientesLote.push({ matricula, nome, dataNasc, cross });
            }

            tbody.innerHTML = '';
            if (pacientesLote.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum paciente válido encontrado.</td></tr>';
            } else {
                pacientesLote.forEach(p => tbody.innerHTML += `<tr><td>${p.matricula}</td><td>${p.nome}</td><td>${formatarData(p.dataNasc)}</td><td>${p.cross || ''}</td></tr>`);
            }
        } catch(err) {
            mostrarToast("Erro ao processar planilha.");
        }
    };
    reader.readAsBinaryString(file);
});

window.abrirModalConfig = function() {
    document.getElementById('config-ano').value = variavelAno;
    document.getElementById('config-hora-azul').value = horarioAzul;
    document.getElementById('config-med-azul').value = medicoAzulId;
    document.getElementById('config-hora-vermelho').value = horarioVermelho;
    document.getElementById('config-med-vermelho').value = medicoVermelhoId;
    document.getElementById('modal-config').showModal();
    atualizarContagemPacientes();
};

window.salvarAnoConfig = async function() {
    const _ano = document.getElementById('config-ano').value.trim();
    if (!_ano) return mostrarToast('Preencha o ano!');
    try {
        await setDoc(doc(db, 'cirurgias', 'METADADOS_BASE'), { ano: _ano }, { merge: true });
        variavelAno = _ano;
        mostrarToast('Ano salvo!');
    } catch (e) { mostrarToast('Erro ao salvar ano.'); }
};

window.salvarTurnosConfig = async function() {
    const hA = document.getElementById('config-hora-azul').value.trim();
    const mA = document.getElementById('config-med-azul').value;
    const hV = document.getElementById('config-hora-vermelho').value.trim();
    const mV = document.getElementById('config-med-vermelho').value;
    try {
        await setDoc(doc(db, 'cirurgias', 'METADADOS_BASE'), {
            horarioAzul: hA,
            medicoAzulId: mA,
            horarioVermelho: hV,
            medicoVermelhoId: mV
        }, { merge: true });
        horarioAzul = hA;
        medicoAzulId = mA;
        horarioVermelho = hV;
        medicoVermelhoId = mV;
        mostrarToast('Turnos salvos!');
    } catch (e) { mostrarToast('Erro ao salvar turnos.'); }
};

async function atualizarContagemPacientes() {
    const el = document.getElementById('contagem-pacientes');
    try {
        const docSnap = await getDoc(doc(db, 'cirurgias', 'METADADOS_BASE'));
        if (docSnap.exists() && docSnap.data().ultimoEnvio) {
            el.textContent = `📊 Última carga: ${docSnap.data().ultimoEnvio} pacientes em ${docSnap.data().dataEnvio}`;
        } else el.textContent = "📊 Nenhuma base registrada ainda.";
    } catch (err) { el.textContent = "📊 Erro ao ler dados."; }
}

window.subirBasePacientes = async function() {
    const fileInput = document.getElementById('arquivo-nuvem-pacientes');
    if (!fileInput.files[0]) return mostrarToast('Selecione uma planilha!');
    const btn = document.getElementById('btn-subir-base');
    btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true });
            const dados = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            let batch = writeBatch(db), count = 0, total = 0;
            for (const row of dados) {
                const { matricula, nome, dataNasc, cross } = extrairDadosDaLinha(row);
                if (!matricula || !nome) continue;
                batch.set(doc(db, 'pacientes', matricula), { nome, dataNasc, cross });
                count++; total++;
                if (count === 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
            }
            if (count > 0) await batch.commit();
            await setDoc(doc(db, 'cirurgias', 'METADADOS_BASE'), { ultimoEnvio: total, dataEnvio: getHojeLocal().split('-').reverse().join('/') }, { merge: true });
            mostrarToast('Base atualizada!');
            fecharModal('modal-config');
            atualizarContagemPacientes();
        } catch (e) { mostrarToast('Erro ao subir base.'); }
        finally { btn.disabled = false; fileInput.value = ''; }
    };
    reader.readAsBinaryString(fileInput.files[0]);
};

let timerBuscaMatricula;
document.getElementById('ind-mat').addEventListener('input', function(e) {
    const rawVal = e.target.value || '';
    const matricula = String(rawVal).replace(/\D/g, '');
    if (matricula.length < 3) return;
    clearTimeout(timerBuscaMatricula);
    timerBuscaMatricula = setTimeout(async () => {
        try {
            const docSnap = await getDoc(doc(db, 'pacientes', matricula));
            if (docSnap.exists()) {
                const d = docSnap.data();
                document.getElementById('ind-nome').value = d.nome || '';
                if (d.dataNasc) document.getElementById('ind-data').value = d.dataNasc;
                document.getElementById('ind-cross').value = d.cross || '';
            }
        } catch(err) {}
    }, 600);
});

async function limparRelatoriosAntigos() {
    try {
        const limite = new Date();
        limite.setMonth(limite.getMonth() - 4);
        const snap = await getDocs(query(collection(db, 'relatorios'), where('data_solicitacao', '<', limite.toISOString().split('T')[0])));
        let batch = writeBatch(db), count = 0;
        snap.forEach(docSnap => { batch.delete(docSnap.ref); count++; if(count === 450) { batch.commit(); batch = writeBatch(db); count = 0; } });
        if(count > 0) await batch.commit();
    } catch(err) {}
}

window.baixarRelatorio = async function() {
    const dIni = document.getElementById('rel-data-inicio').value;
    const dFim = document.getElementById('rel-data-fim').value;
    if (!dIni || !dFim) return mostrarToast("Preencha as duas datas.");
    try {
        mostrarToast("Processando relatório...");
        await limparRelatoriosAntigos();
        const snap = await getDocs(collection(db, 'relatorios'));
        const dadosFiltrados = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.data_solicitacao >= dIni && data.data_solicitacao <= dFim) dadosFiltrados.push({ DATA_SOLICITACAO: data.data_solicitacao, MCV: data.mcv, NOME: data.nome });
        });
        if(dadosFiltrados.length === 0) return mostrarToast("Nenhum dado encontrado.");
        const ws = XLSX.utils.json_to_sheet(dadosFiltrados);
        XLSX.writeFile({ Sheets: { 'Relatorio': ws }, SheetNames: ['Relatorio'] }, 'Relatorio_SAPO.xlsx');
        mostrarToast("Relatório baixado!");
    } catch(err) { mostrarToast("Erro ao baixar relatório."); }
};

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

function gerarSADT(pdf, p, m, exames, dEmissao, img) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(p.nome, 40, 64.2);
    pdf.text(p.matricula, 45, 59.2);
    pdf.text(formatarData(p.dataNasc), 120, 59.2);
    pdf.text(m || '', 75, 152.2);
    pdf.text(dEmissao, 49.5, 84.1);
    pdf.text(`CROSS: ${p.cross || ''}`, 160, 16);
    let y = 94;
    exames.forEach(ex => { pdf.text(`${ex.codigo ? ex.codigo + ' - ' : ''}${ex.nome}`, 29.5, y); y += 5; });
}

function gerarAvaliacao(pdf, p, img, ehI, proposta, anoVigente, medicoTurno) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    if (ehI) { 
        pdf.text(p.nome, 37.5, 48.5); 
        pdf.text(p.matricula, 164, 48.5); 
        pdf.text(formatarData(p.dataNasc), 54, 56.5);
        pdf.text(anoVigente, 170, 56.5); 
        pdf.text(proposta, 88, 67.3);
    } else { 
        pdf.text(p.nome, 35, 42); 
        pdf.text(p.matricula, 169, 42); 
        pdf.text(formatarData(p.dataNasc), 49, 51);
        pdf.text(anoVigente, 170, 51); 
        pdf.text(proposta, 72, 59.8);
        pdf.setFont("helvetica", "bold");
        pdf.text(medicoTurno, 83, 72);
    }
}

function gerarLembreteDoc(pdf, p, img, anoVigente, precisaRaioXTorax, horarioTurno, medicoTurno) {
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(anoVigente, 123, 24.5);
    pdf.text(p.nome, 12, 18);
    pdf.text(p.matricula, 12, 14);
    pdf.text(anoVigente, 77, 213);
    pdf.text(anoVigente, 160, 280);
    pdf.text(medicoTurno, 117, 14.1);
    pdf.setFontSize(13);
    pdf.text(horarioTurno, 113.2, 31.1);
    if (precisaRaioXTorax) pdf.text("X", 100.8, 81.4);
}

async function gerarPDFPaciente(p, cir, med, dEmissao, proposta, horarioTurno, medicoTurno) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const idade = calcularIdade(p.dataNasc);
    const ehI = idade < 12;
    const apenasExames = cir.apenasExames === true;
    const precisaRaioXTorax = !apenasExames && (idade > 60 || (cir.exames || []).some(e => e.nome.toUpperCase().includes('TORAX') || e.nome.toUpperCase().includes('TÓRAX') || e.codigo === '0204030170'));
    const imgS = await carregarImagem('./img/sadt.jpg');
    const imgA = await carregarImagem(ehI ? './img/avaliacao_infantil.jpg' : './img/avaliacao.jpg');
    const imgL = await carregarImagem('./img/lembrete.jpg');
    let first = true;
    const addP = () => { if (!first) pdf.addPage(); first = false; };
    const analises = (cir.exames || []).filter(e => e.grupo === 'analises');
    
    for (let j = 0; j < analises.length; j += 10) { addP(); gerarSADT(pdf, p, med, analises.slice(j, j + 10), dEmissao, imgS); }
    (cir.exames || []).filter(e => e.grupo !== 'analises').forEach(ex => { addP(); gerarSADT(pdf, p, med, [ex], dEmissao, imgS); });
    if (!apenasExames && idade > 60) { addP(); gerarSADT(pdf, p, med, [{ codigo: '0204030170', nome: 'RADIOGRAFIA DE TORAX (PA)' }], dEmissao, imgS); }
    
    if (!apenasExames) {
        addP(); gerarAvaliacao(pdf, p, imgA, ehI, proposta, variavelAno, medicoTurno);
        addP(); gerarLembreteDoc(pdf, p, imgL, variavelAno, precisaRaioXTorax, horarioTurno, medicoTurno);
    }
    return pdf;
}

window.gerarPDFIndividual = async function() {
    const btn = document.getElementById('btn-imp-ind');
    const n = document.getElementById('ind-nome').value.trim();
    const cId = document.getElementById('ind-cirurgia').value;
    const proposta = document.getElementById('ind-proposta').value.trim();
    const cross = document.getElementById('ind-cross').value.trim();
    if (!n || !cId) return mostrarToast('Preencha os dados obrigatórios!');
    
    const turnoEscolhido = document.querySelector('input[name="ind_turno"]:checked')?.value || 'azul';
    const horarioTurno = turnoEscolhido === 'azul' ? horarioAzul : horarioVermelho;
    const medIdTurno = turnoEscolhido === 'azul' ? medicoAzulId : medicoVermelhoId;
    const objMedTurno = bdMedicos.find(m => m.id === medIdTurno);
    const medicoTurno = objMedTurno ? objMedTurno.nome : '';

    btn.disabled = true; btn.textContent = '⏳ Gerando...';
    try {
        const cir = bdCirurgias.find(c => c.id === cId);
        let med = null;
        const mId = document.getElementById('ind-medico').value;
        if (mId) { const oM = bdMedicos.find(m => m.id === mId); if (oM) med = oM.crm ? `${oM.nome} - CRM: ${oM.crm}` : oM.nome; }
        const dE = document.getElementById('ind-emissao').value ? formatarData(document.getElementById('ind-emissao').value) : new Date().toLocaleDateString('pt-BR');
        const p = { matricula: document.getElementById('ind-mat').value.trim(), nome: n, dataNasc: document.getElementById('ind-data').value, cross };
        const pdf = await gerarPDFPaciente(p, cir, med, dE, proposta, horarioTurno, medicoTurno);
        await addDoc(collection(db, 'relatorios'), { data_solicitacao: getHojeLocal(), mcv: p.matricula, nome: p.nome });
        dispararImpressao(pdf);
        
        document.getElementById('ind-mat').value = ''; 
        document.getElementById('ind-nome').value = ''; 
        document.getElementById('ind-data').value = ''; 
        document.getElementById('ind-cross').value = '';
    } catch (e) { mostrarToast('Erro ao gerar documento.'); }
    finally { btn.disabled = false; btn.textContent = '🖨️ Imprimir'; }
};

window.processarLote = async function() {
    if (pacientesLote.length === 0) return mostrarToast('Carregue a planilha!');
    const cId = document.getElementById('lote-cirurgia').value;
    if (!cId) return mostrarToast('Selecione o grupo!');
    const proposta = document.getElementById('lote-proposta').value.trim();
    const btn = document.getElementById('btn-imp-lote');
    
    const turnoEscolhido = document.querySelector('input[name="lote_turno"]:checked')?.value || 'azul';
    const horarioTurno = turnoEscolhido === 'azul' ? horarioAzul : horarioVermelho;
    const medIdTurno = turnoEscolhido === 'azul' ? medicoAzulId : medicoVermelhoId;
    const objMedTurno = bdMedicos.find(m => m.id === medIdTurno);
    const medicoTurno = objMedTurno ? objMedTurno.nome : '';

    btn.disabled = true;
    try {
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
        let batch = writeBatch(db), countRel = 0;
        const hoje = getHojeLocal();
        
        for (let i = 0; i < pacientesLote.length; i++) {
            const p = pacientesLote[i];
            bFill.style.width = Math.round(((i + 1) / pacientesLote.length) * 100) + '%';
            await new Promise(r => setTimeout(r, 10));
            const idade = calcularIdade(p.dataNasc);
            const ehI = idade < 12;
            const apenasExames = cir.apenasExames === true;
            
            const precisaRaioXTorax = !apenasExames && (idade > 60 || (cir.exames || []).some(e => e.nome.toUpperCase().includes('TORAX') || e.nome.toUpperCase().includes('TÓRAX') || e.codigo === '0204030170'));

            const addPag = (fn, ...args) => { if (!first) pdfFinal.addPage(); fn(pdfFinal, ...args); first = false; };
            const analises = (cir.exames || []).filter(e => e.grupo === 'analises');
            for (let j = 0; j < analises.length; j += 10) { addPag(gerarSADT, p, med, analises.slice(j, j + 10), dE, imgS); }
            (cir.exames || []).filter(e => e.grupo !== 'analises').forEach(ex => { addPag(gerarSADT, p, med, [ex], dE, imgS); });
            
            if (!apenasExames && idade > 60) addPag(gerarSADT, p, med, [{ codigo: '0204030170', nome: 'RADIOGRAFIA DE TORAX (PA)' }], dE, imgS);
            
            if (!apenasExames) {
                addPag(gerarAvaliacao, p, ehI ? imgAI : imgA, ehI, proposta, variavelAno, medicoTurno);
                addPag(gerarLembreteDoc, p, imgL, variavelAno, precisaRaioXTorax, horarioTurno, medicoTurno);
            }
            
            batch.set(doc(collection(db, 'relatorios')), { data_solicitacao: hoje, mcv: p.matricula, nome: p.nome });
            countRel++;
            if(countRel === 450) { await batch.commit(); batch = writeBatch(db); countRel = 0; }
        }
        if(countRel > 0) await batch.commit();
        modalProg.close();
        dispararImpressao(pdfFinal);
    } catch(e) { mostrarToast("Erro ao processar lote."); modalProg.close(); }
    finally { btn.disabled = false; }
};

window.fecharModal = function(id) { document.getElementById(id).close(); };
function setarDataHoje() { const h = getHojeLocal(); document.getElementById('ind-emissao').value = h; document.getElementById('lote-emissao').value = h; }
async function carregarImagem(c) { const r = await fetch(c); const b = await r.blob(); return new Promise((res) => { const reader = new FileReader(); reader.onloadend = () => res(reader.result); reader.readAsDataURL(b); }); }
setarDataHoje();
iniciarListeners();