import { calculatePlayerXpForUser, getEvaluationIdFromUrl, updatePlayerXP } from './utils.mjs';
import { updatePlayerProgress, updateSidebar, renderMissionHosts, renderPlayers, renderRanks, renderActions } from './dom.mjs';
import { sendEvaluationData, getEvaluationData, getRanksData, getActionsData } from './api.mjs';
import { findPlayerRank } from './ranks.mjs';
import { API_URL } from './environment.mjs';

let ranks = [];
let actionsMap = {};
const selectedActionsMap = {};

document.addEventListener("DOMContentLoaded", async () => {
    const evaluationId = getEvaluationIdFromUrl();

    try {
        const [evaluationData, fetchedRanks, actions] = await Promise.all([
            getEvaluationData(evaluationId),
            getRanksData(),
            getActionsData()
        ]);

        ranks = fetchedRanks;

        if (actions) {
            for (const category in actions) {
                actions[category].forEach(actionItem => {
                    actionsMap[actionItem.name] = actionItem;
                });
            }
        }

        const form = document.querySelector("form");
        if (form && evaluationId) {
            form.action = form.action.replace("${SESSION_ID}", evaluationId);
        }

        if (evaluationData) {
            renderMissionHosts(evaluationData);
            renderPlayers(evaluationData);
        }

        if (ranks) {
            renderRanks(ranks);
        }

        if (actions) {
            renderActions(actions);

            const playerCards = document.querySelectorAll('.player-card');
            playerCards.forEach(card => {
                const initialXp = parseInt(card.dataset.initialXp, 10);
                const { currentRank, currentIndex } = findPlayerRank(ranks, initialXp);
                card.dataset.initialRankIndex = currentIndex;
                updatePlayerProgress(card, ranks, initialXp);
            });
        }

        setupFormSubmitListener();

    } catch (error) {
        console.error('Error processing data:', error);
    }
});

export function setupFormSubmitListener() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = preparePayload();
        if (!payload.missionName) {
            alert("Mission name is required!");
            return;
        }

        try {
            await sendEvaluationData(payload);
            showFinalSummary();
        } catch (error) {
            console.error("Błąd wysyłania oceny:", error);
            alert("Wystąpił błąd przy kończeniu oceniania.");
        }
    });

    form.addEventListener('change', function(e) {
        if (e.target.name === 'actions') {
            const playerCard = e.target.closest('.player-card');
            if (playerCard) {
                const userId = playerCard.querySelector('input[name="userId"]').value;
                const newXp = updatePlayerXP(playerCard, actionsMap);
                updatePlayerProgress(playerCard, ranks, newXp);

                const name = playerCard.dataset.name;
                const avatarUrl = playerCard.dataset.avatarUrl;
                const checkedActions = Array.from(playerCard.querySelectorAll('input[name="actions"]:checked'))
                    .map(i => i.value);

                let totalXpChange = 0;
                checkedActions.forEach(actionName => {
                    totalXpChange += actionsMap[actionName].value;
                });

                selectedActionsMap[userId] = {
                    name,
                    avatarUrl,
                    actions: checkedActions,
                    totalXpChange
                };

                updateSidebar(selectedActionsMap, actionsMap);
            }
        }
    });
}

export function preparePayload() {
    const usersData = [];
    const userCards = document.querySelectorAll('.player-card');

    userCards.forEach(card => {
        const userIdInput = card.querySelector('input[name="userId"]');
        if (!userIdInput) return;

        const userId = userIdInput.value;
        const checkedActions = Array.from(card.querySelectorAll('input[name="actions"]:checked'))
            .map(input => input.value);

        usersData.push({
            "user_id": userId,
            "actions": checkedActions
        });
    });
    const missionName = document.getElementById("missionTitle").value;

    return {
        "missionName": missionName,
        "users": usersData
    };
}

function showFinalSummary() {
    const form = document.querySelector('form');
    if (form) {
        form.style.display = 'none';
    }

    const summaryContainer = document.getElementById('finalSummaryContainer');
    if (summaryContainer) {
        summaryContainer.style.display = 'block';

        const xpList = document.getElementById('xpSummaryList');
        if (xpList) {
            xpList.innerHTML = '';

            const playerCards = document.querySelectorAll('.player-card');
            playerCards.forEach(card => {
                const name = card.dataset.name;
                const initialXp = parseInt(card.dataset.initialXp, 10);
                const currentXp = parseInt(card.dataset.currentXp, 10);
                const diff = currentXp - initialXp;

                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${name}</strong>
                    – otrzymane XP:
                    <span style="color:${diff >= 0 ? 'green' : 'red'};">
                        ${diff >= 0 ? '+' : ''}${diff}
                    </span>
                    (z ${initialXp} na ${currentXp})
                `;
                xpList.appendChild(li);
            });
        }
    }
}

async function cancelEvaluation() {
    if (!confirm("Czy na pewno chcesz przerwać ocenianie?")) {
        return;
    }
    const evaluationId = getEvaluationIdFromUrl();

    try {
        const response = await fetch(`${API_URL}/evaluation/${evaluationId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Nie udało się usunąć oceny, status: ${response.status}`);
        }

        const form = document.querySelector('form');
        if (form) {
            form.style.display = 'none';
        }

        const cancelledContainer = document.getElementById('cancelledContainer');
        if (cancelledContainer) {
            cancelledContainer.style.display = 'block';
        }
    } catch (err) {
        console.error("Błąd anulowania oceniania:", err);
        alert("Wystąpił błąd przy anulowaniu oceniania.");
    }
}

window.cancelEvaluation = cancelEvaluation;
