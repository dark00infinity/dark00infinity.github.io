  
const app = document.getElementById("root");
const URL = `https://pomber.github.io/covid19/timeseries.json`;
const TOTAL_STAT = `https://corona.lmao.ninja/all`;
let data;

let modal = document.getElementById("myModal");
let span = document.getElementsByClassName("close")[0];
span.onclick = () => {
  modal.style.display = "none";
};
window.onclick = (event) => {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

const handleForm = () => {
  const form = document.createElement("buttons");
  const confirmedButton = document.createElement("button");
  const recoveredButton = document.createElement("button");
  const deathsButton = document.createElement("button");
  const nameButton = document.createElement("button");
  form.classList.add("buttons");
  confirmedButton.classList.add("confirmed");
  confirmedButton.textContent = `Confirmed`;
  recoveredButton.classList.add("recovered");
  recoveredButton.textContent = `Recovered`;
  deathsButton.classList.add("deaths");
  deathsButton.textContent = `Deaths`;
  nameButton.classList.add("name");
  nameButton.textContent = `Name`;
  form.appendChild(confirmedButton);
  form.appendChild(recoveredButton);
  form.appendChild(deathsButton);
  form.appendChild(nameButton);
  app.appendChild(form);
  confirmedButton.addEventListener("click", (e) => {
    e.preventDefault();
    let newData = _.clone(data);
    const sortedCountryList = _.orderBy(
      newData.country,
      (i) => i.confirmed
    ).reverse();
    document.querySelector("main").remove();
    handleBody(sortedCountryList);
    handleEmojis();
  });
  recoveredButton.addEventListener("click", (e) => {
    e.preventDefault();
    let newData = _.clone(data);
    const sortedCountryList = _.orderBy(
      newData.country,
      (i) => i.recovered
    ).reverse();
    document.querySelector("main").remove();
    handleBody(sortedCountryList);
    handleEmojis();
  });
  deathsButton.addEventListener("click", (e) => {
    e.preventDefault();
    let newData = _.clone(data);
    const sortedCountryList = _.orderBy(
      newData.country,
      (i) => i.deaths
    ).reverse();
    document.querySelector("main").remove();
    handleBody(sortedCountryList);
    handleEmojis();
  });
  nameButton.addEventListener("click", (e) => {
    e.preventDefault();
    let newData = _.clone(data);
    const sortedCountryList = _.orderBy(newData.country, (i) => i.name);
    document.querySelector("main").remove();
    handleBody(sortedCountryList);
    handleEmojis();
  });
};

const handleHead = (data) => {
  const headArea = document.createElement("header");
  let html = ``;
  for (let key in data) {
    if (key === "cases" || key === "deaths" || key === "recovered" || key === "active") {
      html += `
      <div class="total">
      <div class=${key.toLowerCase()}>
      <span>${key}:</span>
      <span>${data[key]}</span>
      </div>
      </div>
      `;
    } else {
      continue;
      console.log("asd", key);
    }
  }
  headArea.innerHTML = html;
  app.appendChild(headArea);
};

const handleBody = (data) => {
  const mainArea = document.createElement("main");
  let html = ``;
  for (let key in data) {
    const latestFigure = data[key];
    let url = latestFigure.name
      .split(" ")
      .join("-")
      .toLowerCase()
      .replace(/[,{1,}|({1,}|){1,}|*{1,}|'{1,}]/g, "");
    html += `
    <div class="country" data-country="${url}">
      <div class="country__name">
        <span>${latestFigure.name}</span>
      </div>
      <div class="country__date">
        <span>Date:</span>
        <span>${latestFigure.date}</span>
      </div>
      <div class="country__confirmed">
        <span>Confirmed:</span>
        <span>${latestFigure.confirmed}</span>
      </div>
      <div class="country__recovered">
        <span>Recovered:</span>
        <span>${latestFigure.recovered}</span>
      </div>
      <div class="country__deaths">
        <span>Deaths:</span>
        <span>${latestFigure.deaths}</span>
      </div>
    </div>
  `;
  }
  mainArea.innerHTML = html;
  app.appendChild(mainArea);
};

const handleData = (data) => {
  handleHead(data.total);
  handleBody(data.country);
  handleEmojis();
};

const getData = async () => {
  try {
    const firstRequest = await fetch(URL);
    const firstJson = await firstRequest.json();
    const secondRequest = await fetch(TOTAL_STAT);
    const secondJson = await secondRequest.json();
    let revisedFirstJson = _.map(firstJson, (v, k) =>
      _.merge({}, v[v.length - 1], { name: k })
    );
    const sortedCountryList = _.orderBy(
      revisedFirstJson,
      (i) => i.deaths
    ).reverse();
    data = {
      country: sortedCountryList,
      total: secondJson,
    };
    return {
      country: sortedCountryList,
      total: secondJson,
    };
  } catch (err) {
    console.log(err);
  }
};

const handleEmojis = () => {
  document.querySelectorAll(".country").forEach((place) => {
    let originalCounter;
    let newPostKey = place.dataset.country;
    let countRef = firebase.database().ref(newPostKey);
    let box = document.createElement("div");
    box.classList.add("emojis");
    // DOVE
    let doveBox = document.createElement("div");
    let doveButton = document.createElement("a");
    let doveCounter = document.createElement("p");
    doveBox.classList.add("dove");
    doveButton.classList.add("dove__button");
    doveButton.setAttribute("title", "Send a Message");
    doveCounter.classList.add("dove__count");
    doveButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/2741/2741203.svg" alt="Support">`;
    doveButton.setAttribute("href", "#");
    doveBox.appendChild(doveButton);
    doveBox.appendChild(doveCounter);
    // CRY
    let cryingBox = document.createElement("div");
    let cryingButton = document.createElement("a");
    let cryingCounter = document.createElement("p");
    cryingBox.classList.add("crying");
    cryingButton.classList.add("happy__button");
    cryingButton.setAttribute("title", "Crying Reaction");
    cryingCounter.classList.add("happy__count");
    cryingButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/187/187150.svg" alt="Crying">`;
    cryingButton.setAttribute("href", "#");
    cryingBox.appendChild(cryingButton);
    cryingBox.appendChild(cryingCounter);
    // ANGRY
    let angryBox = document.createElement("div");
    let angryButton = document.createElement("a");
    let angryCounter = document.createElement("p");
    angryBox.classList.add("angry");
    angryButton.classList.add("angry__button");
    angryButton.setAttribute("title", "Angry Reaction");
    angryCounter.classList.add("angry__count");
    angryButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/187/187140.svg" alt="Angry">`;
    angryButton.setAttribute("href", "#");
    angryBox.appendChild(angryButton);
    angryBox.appendChild(angryCounter);
    // SICK
    let sickBox = document.createElement("div");
    let sickButton = document.createElement("a");
    let sickCounter = document.createElement("p");
    sickBox.classList.add("sick");
    sickButton.classList.add("sick__button");
    sickButton.setAttribute("title", "Sick Reaction");
    sickCounter.classList.add("sick__count");
    sickButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/187/187165.svg" alt="Sick">`;
    sickButton.setAttribute("href", "#");
    sickBox.appendChild(sickButton);
    sickBox.appendChild(sickCounter);
    // NINJA
    let ninjaBox = document.createElement("div");
    let ninjaButton = document.createElement("a");
    let ninjaCounter = document.createElement("p");
    ninjaBox.classList.add("ninja");
    ninjaButton.classList.add("ninja__button");
    ninjaButton.setAttribute("title", "Keeping Safe Reaction");
    ninjaCounter.classList.add("ninja__count");
    ninjaButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/187/187164.svg" alt="Ninja">`;
    ninjaButton.setAttribute("href", "#");
    ninjaBox.appendChild(ninjaButton);
    ninjaBox.appendChild(ninjaCounter);
    // BORED
    let boredBox = document.createElement("div");
    let boredButton = document.createElement("a");
    let boredCounter = document.createElement("p");
    boredBox.classList.add("bored");
    boredButton.classList.add("bored__button");
    boredButton.setAttribute("title", "Bored Reaction");
    boredCounter.classList.add("bored__count");
    boredButton.innerHTML = `<img src="https://image.flaticon.com/icons/svg/187/187157.svg" alt="Bored">`;
    boredButton.setAttribute("href", "#");
    boredBox.appendChild(boredButton);
    boredBox.appendChild(boredCounter);
    // FINISHED EMOJIS DOM
    box.appendChild(cryingBox);
    box.appendChild(angryBox);
    box.appendChild(sickBox);
    box.appendChild(ninjaBox);
    box.appendChild(boredBox);
    box.appendChild(doveBox);
    place.appendChild(box);
    place.querySelectorAll(".emojis a").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        let currentButton = e.currentTarget.parentElement;
        let selectedCountry =
          e.currentTarget.parentElement.parentElement.parentElement.dataset
            .country;
        handleClick(currentButton, selectedCountry);
      });
    });
    countRef.on("child_added", (data) => {
      if (data.key === "messages") {
        doveCounter.textContent = data.val().length;
      }
      if (data.key === "crying") {
        cryingCounter.textContent = data.val();
      }
      if (data.key === "angry") {
        angryCounter.textContent = data.val();
      }
      if (data.key === "sick") {
        sickCounter.textContent = data.val();
      }
      if (data.key === "ninja") {
        ninjaCounter.textContent = data.val();
      }
      if (data.key === "bored") {
        boredCounter.textContent = data.val();
      }
    });
    countRef.on("child_changed", (data) => {
      if (data.key === "messages") {
        doveCounter.textContent = data.val().length;
      }
      if (data.key === "crying") {
        cryingCounter.textContent = data.val();
      }
      if (data.key === "angry") {
        angryCounter.textContent = data.val();
      }
      if (data.key === "sick") {
        sickCounter.textContent = data.val();
      }
      if (data.key === "ninja") {
        ninjaCounter.textContent = data.val();
      }
      if (data.key === "bored") {
        boredCounter.textContent = data.val();
      }
    });
    countRef
      .once("value")
      .then((snapshot) => {
        originalCounter = snapshot.val()
          ? snapshot.val()
          : { messages: [], crying: 0, angry: 0, sick: 0, ninja: 0, bored: 0 };
        doveCounter.textContent =
          originalCounter.messages === undefined ||
          originalCounter.messages.length === 0
            ? 0
            : originalCounter.messages.length;
        cryingCounter.textContent = originalCounter.crying;
        angryCounter.textContent = originalCounter.angry;
        sickCounter.textContent = originalCounter.sick;
        ninjaCounter.textContent = originalCounter.ninja;
        boredCounter.textContent = originalCounter.bored;
      })
      .catch((err) => alert(err.message));
    const handleAddMessageClick = (selectedCountry) => {
      let postData;
      const message = prompt("Send your message!");
      if (!message || message.trim() === "") {
        alert("Please add a valid message.");
        return;
      }
      let getMessages = firebase.database().ref(`${newPostKey}/messages`);
      getMessages.on("value", (snap) => {
        const originalMessages =
          snap.val() === null || snap.val() === undefined ? [] : snap.val();
        postData = {
          ...originalCounter,
          messages: originalMessages.concat(message),
        };
      });
      firebase
        .database()
        .ref(selectedCountry)
        .set(postData, (error) => {
          if (error) {
            alert(error.message);
          }
        });
      modal.style.display = "none";
    };
    const handleClick = (currentButton, selectedCountry) => {
      if (currentButton.classList.contains("dove")) {
        let html = ``;
        html += `<button id="addMessage" class="confirmed">Send your Message</button><div><h1>Messages:</h1>`;
        let getMessages = firebase.database().ref(`${newPostKey}/messages`);
        getMessages.on("value", (snap) => {
          snap.val() === null ||
          snap.val() === undefined ||
          snap.val().length === 0
            ? (html += "<p>No messages available.</p>")
            : snap.val().map((i) => (html += `<p>${i}</p>`));
        });
        html += `</div>`;
        modal.style.display = "block";
        modal.querySelector(".modal-body").innerHTML = html;
        modal.querySelector("button").addEventListener("click", (e) => {
          e.preventDefault();
          handleAddMessageClick(selectedCountry);
        });
        return;
      }
      if (currentButton.classList.contains("crying")) {
        postData = {
          ...originalCounter,
          crying: ++originalCounter.crying,
        };
      }
      if (currentButton.classList.contains("angry")) {
        postData = {
          ...originalCounter,
          angry: ++originalCounter.angry,
        };
      }
      if (currentButton.classList.contains("sick")) {
        postData = {
          ...originalCounter,
          sick: ++originalCounter.sick,
        };
      }
      if (currentButton.classList.contains("ninja")) {
        postData = {
          ...originalCounter,
          ninja: ++originalCounter.ninja,
        };
      }
      if (currentButton.classList.contains("bored")) {
        postData = {
          ...originalCounter,
          bored: ++originalCounter.bored,
        };
      }
      firebase
        .database()
        .ref(selectedCountry)
        .set(postData, (error) => {
          if (error) {
            alert(error.message);
          }
        });
    };
  });
};

getData()
  .then(handleData)
  .catch((error) => console.log(error));

window.addEventListener("load", () => {
  handleForm();
});