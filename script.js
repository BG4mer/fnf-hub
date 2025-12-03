let exp = Number(localStorage.getItem("fnf:exp") || 0);
let unlocked = JSON.parse(localStorage.getItem("fnf:achievements") || "[]");
let appOpens = JSON.parse(localStorage.getItem("fnf:opens") || "{}");

const appsGrid = document.getElementById("app-grid");
const expFill = document.getElementById("exp-fill");
const levelDisplay = document.getElementById("level");
const achievementsModal = document.getElementById("achievements-modal");
const achievementsBtn = document.getElementById("achievements-btn");
const closeAchievementsBtn = document.getElementById("close-achievements");
const logo = document.getElementById("logo");

const appsData = JSON.parse(document.getElementById("apps-data").textContent);

const achievements = [
  {id:"first_click", name:"First Click", desc:"Opened your first app", exp:10},
  {id:"explorer", name:"Explorer", desc:"Open 5 different apps", exp:30},
  {id:"legendary", name:"Legendary Mode", desc:"Found the secret Easter egg", exp:100},
];

function saveData() {
  localStorage.setItem("fnf:exp", exp);
  localStorage.setItem("fnf:achievements", JSON.stringify(unlocked));
  localStorage.setItem("fnf:opens", JSON.stringify(appOpens));
}

function gainExp(n) {
  exp += n;
  saveData();
  updateExpBar();
}

function unlockAchievement(id) {
  if(!unlocked.includes(id)){
    unlocked.push(id);
    const ach = achievements.find(a=>a.id===id);
    if(ach) gainExp(ach.exp);
    saveData();
    alert(`Achievement Unlocked: ${ach.name}`);
  }
}

function updateExpBar() {
  const level = Math.floor(exp/100)+1;
  levelDisplay.textContent = level;
  const progress = (exp % 100)/100*100;
  expFill.style.width = progress + "%";
}

function renderApps() {
  appsGrid.innerHTML = "";
  appsData.forEach(app=>{
    const card = document.createElement("div");
    card.className = "app-card";
    card.innerHTML = `<img src="${app.img}" alt="${app.title}"><div class="card-content"><h3>${app.title}</h3><p>${app.desc}</p><button>Open</button></div>`;
    card.querySelector("button").onclick = ()=>{
      window.open(app.url, "_blank");
      appOpens[app.id] = (appOpens[app.id]||0)+1;
      if(!unlocked.includes("first_click")) unlockAchievement("first_click");
      if(Object.keys(appOpens).length>=5 && !unlocked.includes("explorer")) unlockAchievement("explorer");
      saveData();
    };
    appsGrid.appendChild(card);
  });
}

achievementsBtn.onclick = ()=>achievementsModal.classList.remove("hidden");
closeAchievementsBtn.onclick = ()=>achievementsModal.classList.add("hidden");

logo.addEventListener("click", ()=>{
  unlockAchievement("legendary");
  alert("Legendary Mode Activated!");
});

updateExpBar();
renderApps();