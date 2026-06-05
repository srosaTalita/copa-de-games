(function () {
    var PLAYERS = ['Talita', 'Natalia', 'Adriel'];
    var POINTS = { 1: 10, 2: 6, 3: 3 };
    var ROUNDS = [
        { id: 1, game: 'Polytopia' },
        { id: 2, game: 'Polytopia' },
        { id: 3, game: 'Deep Sea Adventure' },
        { id: 4, game: 'Seven Wonders' },
        { id: 5, game: 'Harmonies' },
        { id: 6, game: 'Polytopia' },
        { id: 7, game: 'Deep Sea Adventure' },
        { id: 8, game: 'Harmonies' }
    ];
    var STORAGE_KEY = 'copaDeJogos2026';
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyBAhNbfc7sASMGJyprlwFkN2btI0qpqvSQ",
        authDomain: "copa-1ba65.firebaseapp.com",
        databaseURL: "https://copa-1ba65-default-rtdb.firebaseio.com",
        projectId: "copa-1ba65",
        storageBucket: "copa-1ba65.firebasestorage.app",
        messagingSenderId: "962415568465",
        appId: "1:962415568465:web:a6b2c166a6f50560923a70",
        measurementId: "G-67NMKY14S9"
    };

    var db = null;
    var dbRef = null;
    var firebaseReady = false;
    var isSaving = false;
    var results = loadFromLocalStorage();

    function loadFromLocalStorage() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    }

    function initFirebase() {
        try {
            if (FIREBASE_CONFIG.apiKey === 'COLOQUE_SUA_API_KEY_AQUI') {
                updateSyncStatus('offline');
                return;
            }
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.database();
            dbRef = db.ref('copaDeJogos/results');

            db.ref('.info/connected').on('value', function (snap) {
                if (snap.val() === true) {
                    updateSyncStatus('connected');
                } else {
                    updateSyncStatus('disconnected');
                }
            });

            dbRef.on('value', function (snap) {
                var data = snap.val();
                if (data && typeof data === 'object') {
                    var cleaned = {};
                    Object.keys(data).forEach(function (key) {
                        var val = data[key];
                        if (val && typeof val === 'object') {
                            cleaned[key] = {};
                            Object.keys(val).forEach(function (pos) {
                                cleaned[key][pos] = val[pos];
                            });
                        }
                    });
                    results = cleaned;
                    saveToLocalStorage();
                    refreshAll();
                    updateSyncStatus('synced');
                }
            }, function (err) {
                console.error('Firebase read error:', err);
                updateSyncStatus('error');
            });

            firebaseReady = true;
            saveToFirebase();
        } catch (e) {
            console.error('Firebase init error:', e);
            updateSyncStatus('error');
        }
    }

    function saveToFirebase() {
        if (!firebaseReady || !dbRef) return;
        isSaving = true;
        dbRef.set(results).then(function () {
            isSaving = false;
            updateSyncStatus('synced');
        }).catch(function (err) {
            isSaving = false;
            console.error('Firebase save error:', err);
            updateSyncStatus('error');
        });
    }

    function updateSyncStatus(status) {
        var dot = document.getElementById('sync-dot');
        var text = document.getElementById('sync-text');
        if (!dot || !text) return;

        dot.className = 'sync-dot';
        switch (status) {
            case 'connected':
                dot.classList.add('sync-connected');
                text.textContent = 'Conectado';
                break;
            case 'synced':
                dot.classList.add('sync-synced');
                text.textContent = 'Sincronizado';
                break;
            case 'disconnected':
                dot.classList.add('sync-disconnected');
                text.textContent = 'Offline — dados locais';
                break;
            case 'error':
                dot.classList.add('sync-error');
                text.textContent = 'Erro na sincronização';
                break;
            case 'offline':
            default:
                dot.classList.add('sync-disconnected');
                text.textContent = 'Modo local';
                break;
        }
    }

    function saveResults() {
        saveToLocalStorage();
        saveToFirebase();
    }

    function init() {
        renderRounds();
        renderRanking();
        renderStats();
        renderPodium();
        updateProgress();
        setupTabs();
        setupClear();
        setupPdf();
        setupJsonBackup();
        initFirebase();
    }

    function setupTabs() {
        document.querySelectorAll('.tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });
    }

    function setupClear() {
        var btnClear = document.getElementById('btn-clear');
        var btnCancel = document.getElementById('btn-cancel');
        var btnConfirm = document.getElementById('btn-confirm');
        var overlay = document.getElementById('modal-overlay');

        btnClear.addEventListener('click', function () {
            overlay.classList.add('active');
        });

        btnCancel.addEventListener('click', function () {
            overlay.classList.remove('active');
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        btnConfirm.addEventListener('click', function () {
            results = {};
            saveResults();
            overlay.classList.remove('active');
            refreshAll();
        });
    }

    function setupPdf() {
        document.getElementById('btn-pdf').addEventListener('click', exportPdf);
    }

    function setupJsonBackup() {
        document.getElementById('btn-export-json').addEventListener('click', exportJson);
        document.getElementById('btn-import-json').addEventListener('change', importJson);
    }

    function exportJson() {
        var blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'copa-de-jogos-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importJson(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var data = JSON.parse(ev.target.result);
                if (typeof data !== 'object') {
                    alert('Arquivo inválido.');
                    return;
                }
                results = data;
                saveResults();
                refreshAll();
                alert('Dados restaurados com sucesso!');
            } catch (err) {
                alert('Erro ao ler o arquivo: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function renderRounds() {
        var grid = document.getElementById('rounds-grid');
        grid.innerHTML = '';

        ROUNDS.forEach(function (round) {
            var card = document.createElement('div');
            card.className = 'card round-card';

            var roundData = results[round.id] || {};
            var isComplete = roundData[1] && roundData[2] && roundData[3];
            if (isComplete) card.classList.add('completed');

            var statusClass = isComplete ? 'done' : 'pending';
            var statusText = isComplete ? '✓ Completa' : 'Pendente';

            card.innerHTML =
                '<div class="round-header">' +
                    '<div>' +
                        '<div class="round-number">Rodada ' + round.id + '</div>' +
                        '<div class="round-game">' + round.game + '</div>' +
                    '</div>' +
                    '<span class="round-status ' + statusClass + '">' + statusText + '</span>' +
                '</div>' +
                '<div class="round-selects">' +
                    buildSelect(round.id, 1, roundData[1] || '') +
                    buildSelect(round.id, 2, roundData[2] || '') +
                    buildSelect(round.id, 3, roundData[3] || '') +
                '</div>';

            grid.appendChild(card);
        });

        document.querySelectorAll('.round-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                handleSelectChange(sel);
            });
        });

        updateAvailableOptions();
    }

    function buildSelect(roundId, position, selected) {
        var medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        var labels = { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' };

        var html =
            '<div class="select-group">' +
                '<div class="select-label"><span class="medal">' + medals[position] + '</span> ' + labels[position] + '</div>' +
                '<select class="round-select" data-round="' + roundId + '" data-position="' + position + '">' +
                    '<option value="">Selecione...</option>';

        PLAYERS.forEach(function (player) {
            var sel = selected === player ? ' selected' : '';
            html += '<option value="' + player + '"' + sel + '>' + player + '</option>';
        });

        html += '</select></div>';
        return html;
    }

    function handleSelectChange(sel) {
        var roundId = parseInt(sel.dataset.round);
        var position = parseInt(sel.dataset.position);
        var value = sel.value;

        if (!results[roundId]) results[roundId] = {};

        if (!value) {
            delete results[roundId][position];
            if (Object.keys(results[roundId]).length === 0) delete results[roundId];
        } else {
            results[roundId][position] = value;
        }

        saveResults();
        updateAvailableOptions();
        updateRoundStatus();
        renderRanking();
        renderStats();
        renderPodium();
        updateProgress();
    }

    function updateAvailableOptions() {
        document.querySelectorAll('.round-select').forEach(function (sel) {
            var roundId = parseInt(sel.dataset.round);
            var currentPosition = parseInt(sel.dataset.position);
            var roundData = results[roundId] || {};

            var selectedInRound = {};
            for (var pos in roundData) {
                if (parseInt(pos) !== currentPosition) {
                    selectedInRound[roundData[pos]] = true;
                }
            }

            Array.from(sel.options).forEach(function (opt) {
                if (!opt.value) return;
                if (selectedInRound[opt.value] && opt.value !== (roundData[currentPosition] || '')) {
                    opt.disabled = true;
                } else {
                    opt.disabled = false;
                }
            });

            var hasError = sel.value && selectedInRound[sel.value];
            sel.classList.toggle('error', hasError);
        });
    }

    function updateRoundStatus() {
        var cards = document.querySelectorAll('.round-card');
        cards.forEach(function (card, index) {
            var round = ROUNDS[index];
            var roundData = results[round.id] || {};
            var isComplete = roundData[1] && roundData[2] && roundData[3];

            card.classList.toggle('completed', isComplete);

            var status = card.querySelector('.round-status');
            if (isComplete) {
                status.className = 'round-status done';
                status.textContent = '✓ Completa';
            } else {
                status.className = 'round-status pending';
                status.textContent = 'Pendente';
            }
        });
    }

    function calculateRanking() {
        var stats = {};
        PLAYERS.forEach(function (p) {
            stats[p] = { points: 0, wins: 0, seconds: 0, thirds: 0, polytopiaPoints: 0, sevenWondersPoints: 0 };
        });

        ROUNDS.forEach(function (round) {
            var roundData = results[round.id];
            if (!roundData) return;

            [1, 2, 3].forEach(function (pos) {
                var player = roundData[pos];
                if (!player || !stats[player]) return;

                stats[player].points += POINTS[pos];
                if (pos === 1) stats[player].wins++;
                if (pos === 2) stats[player].seconds++;
                if (pos === 3) stats[player].thirds++;

                if (round.game === 'Polytopia') {
                    stats[player].polytopiaPoints += POINTS[pos];
                }
                if (round.game === 'Seven Wonders') {
                    stats[player].sevenWondersPoints += POINTS[pos];
                }
            });
        });

        var ranked = PLAYERS.map(function (p) {
            return {
                name: p,
                points: stats[p].points,
                wins: stats[p].wins,
                seconds: stats[p].seconds,
                thirds: stats[p].thirds,
                polytopiaPoints: stats[p].polytopiaPoints,
                sevenWondersPoints: stats[p].sevenWondersPoints
            };
        });

        ranked.sort(function (a, b) {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.seconds !== a.seconds) return b.seconds - a.seconds;
            if (b.polytopiaPoints !== a.polytopiaPoints) return b.polytopiaPoints - a.polytopiaPoints;
            if (b.sevenWondersPoints !== a.sevenWondersPoints) return b.sevenWondersPoints - a.sevenWondersPoints;
            return 0;
        });

        var finalRank = [];
        for (var i = 0; i < ranked.length; i++) {
            var player = ranked[i];
            player.rank = i + 1;
            player.tied = false;

            if (i > 0) {
                var prev = finalRank[i - 1];
                if (prev.points === player.points &&
                    prev.wins === player.wins &&
                    prev.seconds === player.seconds &&
                    prev.polytopiaPoints === player.polytopiaPoints &&
                    prev.sevenWondersPoints === player.sevenWondersPoints) {
                    player.tied = true;
                    prev.tied = true;
                }
            }
            finalRank.push(player);
        }

        return finalRank;
    }

    function renderRanking() {
        var tbody = document.getElementById('ranking-body');
        var ranked = calculateRanking();

        tbody.innerHTML = '';
        ranked.forEach(function (p, i) {
            var rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
            var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            var badgeClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            var tiedLabel = p.tied ? ' <span class="podium-tied-label">Empate Técnico</span>' : '';

            var tr = document.createElement('tr');
            tr.className = rankClass;
            tr.innerHTML =
                '<td>' + medal + '</td>' +
                '<td><span class="player-name">' + p.name + tiedLabel + '</span></td>' +
                '<td><span class="points-badge ' + badgeClass + '">' + p.points + '</span></td>' +
                '<td>' + p.wins + '</td>' +
                '<td>' + p.seconds + '</td>';
            tbody.appendChild(tr);
        });
    }

    function renderStats() {
        var grid = document.getElementById('stats-grid');
        var ranked = calculateRanking();

        var maxPoints = ROUNDS.length * POINTS[1];
        var playerColors = { 'Talita': 'talita', 'Natalia': 'natalia', 'Adriel': 'adriel' };

        grid.innerHTML = '';
        ranked.forEach(function (p) {
            var pct = maxPoints > 0 ? ((p.points / maxPoints) * 100).toFixed(1) : '0.0';
            var tiedLabel = p.tied ? ' <span class="podium-tied-label" style="font-size:0.65rem">Empate Técnico</span>' : '';

            var card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML =
                '<div class="stat-player ' + playerColors[p.name] + '">' + p.name + tiedLabel + '</div>' +
                '<div class="stat-rows">' +
                    '<div class="stat-row"><span class="label">🥇 Vitórias (1º)</span><span class="value">' + p.wins + '</span></div>' +
                    '<div class="stat-row"><span class="label">🥈 Segundos lugares</span><span class="value">' + p.seconds + '</span></div>' +
                    '<div class="stat-row"><span class="label">🥉 Terceiros lugares</span><span class="value">' + p.thirds + '</span></div>' +
                    '<div class="stat-row"><span class="label">📈 Aproveitamento</span><span class="value">' + pct + '%</span></div>' +
                    '<div class="stat-row"><span class="label">🎮 Polytopia</span><span class="value">' + p.polytopiaPoints + ' pts</span></div>' +
                    '<div class="stat-row"><span class="label">🏛️ Seven Wonders</span><span class="value">' + p.sevenWondersPoints + ' pts</span></div>' +
                '</div>' +
                '<div class="stat-total"><span class="label">Total</span><span class="value">' + p.points + '</span></div>';
            grid.appendChild(card);
        });
    }

    function renderPodium() {
        var podium = document.getElementById('podium');
        var ranked = calculateRanking();
        var completedRounds = Object.keys(results).filter(function (k) {
            var r = results[k];
            return r[1] && r[2] && r[3];
        }).length;

        if (completedRounds === 0) {
            podium.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><p style="color:var(--text-secondary);font-size:1.1rem;">Preencha as rodadas para ver a classificação final 🏆</p></div>';
            return;
        }

        var positions = ['first', 'second', 'third'];
        var titles = ['🏆 Campeão', '🥈 Vice-campeão', '🥉 Terceiro lugar'];
        var emojis = ['🏆', '🥈', '🥉'];

        podium.innerHTML = '';
        ranked.forEach(function (p, i) {
            var tiedLabel = p.tied ? '<span class="podium-tied-label">Empate Técnico</span>' : '';
            var card = document.createElement('div');
            card.className = 'podium-card ' + positions[i];
            if (p.tied) card.classList.add('tied');

            card.innerHTML =
                '<div class="podium-position">' + emojis[i] + '</div>' +
                '<div class="podium-info">' +
                    '<div class="podium-name">' + p.name + tiedLabel + '</div>' +
                    '<div class="podium-points">' + p.points + ' pontos · ' + p.wins + ' vitórias · ' + titles[i] + '</div>' +
                '</div>' +
                '<div class="podium-badge">' + (i + 1) + 'º</div>';

            podium.appendChild(card);
        });
    }

    function updateProgress() {
        var completed = 0;
        ROUNDS.forEach(function (round) {
            var r = results[round.id];
            if (r && r[1] && r[2] && r[3]) completed++;
        });

        var pct = Math.round((completed / ROUNDS.length) * 100);
        document.getElementById('progress-text').textContent = completed + ' de ' + ROUNDS.length + ' rodadas preenchidas';
        document.getElementById('progress-percent').textContent = pct + '%';
        document.getElementById('progress-fill').style.width = pct + '%';
    }

    function exportPdf() {
        var ranked = calculateRanking();

        var content = '';
        content += '<html><head><title>Copa de Jogos - Classificação</title>';
        content += '<style>';
        content += 'body{font-family:Arial,sans-serif;color:#222;padding:40px;}';
        content += 'h1{text-align:center;color:#5B2A86;font-size:28px;margin-bottom:5px;}';
        content += 'h2{text-align:center;color:#7B4DB5;font-size:16px;margin-bottom:30px;font-weight:normal;}';
        content += 'table{width:100%;border-collapse:collapse;margin-bottom:30px;}';
        content += 'th{background:#5B2A86;color:white;padding:12px;text-align:left;font-size:14px;}';
        content += 'td{padding:10px 12px;border-bottom:1px solid #ddd;font-size:14px;}';
        content += 'tr:nth-child(even){background:#f9f9f9;}';
        content += '.winner{background:#fff9e6!important;font-weight:bold;}';
        content += '.round-section h3{color:#5B2A86;margin:20px 0 10px;}';
        content += '.round-section table{margin-bottom:10px;}';
        content += '@media print{body{padding:20px;}}';
        content += '</style></head><body>';

        content += '<h1>🏆 Copa de Jogos</h1>';
        content += '<h2>Classificação Final - Temporada 2026</h2>';

        content += '<table><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Vitórias</th><th>2ºs Lugares</th><th>3ºs Lugares</th><th>Polytopia</th><th>Seven Wonders</th></tr></thead><tbody>';

        ranked.forEach(function (p, i) {
            var cls = i === 0 ? ' class="winner"' : '';
            var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            var tied = p.tied ? ' (Empate Técnico)' : '';
            content += '<tr' + cls + '><td>' + medal + '</td><td>' + p.name + tied + '</td><td><strong>' + p.points + '</strong></td><td>' + p.wins + '</td><td>' + p.seconds + '</td><td>' + p.thirds + '</td><td>' + p.polytopiaPoints + '</td><td>' + p.sevenWondersPoints + '</td></tr>';
        });

        content += '</tbody></table>';

        content += '<div class="round-section"><h3>Resultados por Rodada</h3>';
        ROUNDS.forEach(function (round) {
            var r = results[round.id];
            content += '<table><thead><tr><th colspan="3">Rodada ' + round.id + ' - ' + round.game + '</th></tr></thead><tbody>';
            if (r && r[1]) {
                content += '<tr><td>🥇 1º lugar</td><td>' + r[1] + '</td><td>10 pts</td></tr>';
                content += '<tr><td>🥈 2º lugar</td><td>' + r[2] + '</td><td>6 pts</td></tr>';
                content += '<tr><td>🥉 3º lugar</td><td>' + r[3] + '</td><td>3 pts</td></tr>';
            } else {
                content += '<tr><td colspan="3" style="color:#999;">Não preenchida</td></tr>';
            }
            content += '</tbody></table>';
        });
        content += '</div>';

        content += '</body></html>';

        var win = window.open('', '_blank');
        win.document.write(content);
        win.document.close();
        win.print();
    }

    function refreshAll() {
        renderRounds();
        renderRanking();
        renderStats();
        renderPodium();
        updateProgress();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
