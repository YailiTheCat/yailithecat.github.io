const style = `
html, body {
    margin: 0;
    padding: 0;
}

* {
    box-sizing: border-box;
}

body {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    background: #040D12;
    font-family: "Inter", sans-serif;
    font-optical-sizing: auto;
    font-style: normal;
}

h1 {
    color: #5C8374;
    font-size: 32px;
}

#log {
    font-family: "Google Sans Code", monospace;
    font-optical-sizing: auto;
    font-style: normal;
    color: #93B1A6;
    width: 800px;
    height: 400px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px 10px;
    border: 1px solid #93B1A6;
    border-radius: 5px;
    margin-top: 40px;
    overflow: auto;
}

#content, form, #login-main, #login-second-factor {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

button {
    padding: 10px 40px;
    background: #183D3D;
    border: 2px solid #5C8374;
    border-radius: 5px;
    cursor: pointer;
    color: #93B1A6;
    font-family: "Inter", sans-serif;    
    font-size: 14px;
}

button:hover {
    background: #5C8374;
    color: #183D3D;
}

button:active {
    background: #040D12;
    color: #93B1A6;
}

button:disabled {
    cursor: not-allowed;
    opacity: .3;
    background: #183D3D;
    color: #93B1A6;
}

form button {
    margin-top: 25px;
}

form label {
    margin-top: 15px;
    display: flex;
    flex-direction: column;
}

form span {
    color: white;
    font-size: 16px;
}

form input {
    margin-top: 5px;
    font-size: 16px;
    padding: 4px 6px;
    color: #93B1A6;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #93B1A6;
    border-radius: 2px;
    font-family: "Inter", sans-serif;
}
`;

let pLimit = null;
let limitFn = null;

const getFriends = (page, online) => fetch(`https://api.vrchat.cloud/api/1/auth/user/friends?offset=${page * 50}&offline=${!online}&n=50`, {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    },
    credentials: "same-origin"
}).then(res => res.json());

const getMutualFriendsOfFriend = (id, page) => fetch(`https://api.vrchat.cloud/api/1/users/${id}/mutuals/friends?offset=${page * 50}&n=50`, {
    method: "GET",
    headers: {
        "Content-Type": "application/json"
    },
    credentials: "same-origin"
}).then(res => res.json());

const getMutualAllMutualFriendsOfFriend = async (id) => {
    let data = [];
    let page = 0;

    while(true) {
        const pageData = await getMutualFriendsOfFriend(id, page);
        data = [...data, ...pageData];
        page++;
        if (pageData.length === 0) {
            break;
        }
    }

    return data;
}

const getAllFriends = async () => {
    let data = [];
    let page = 0;

    while(true) {
        const pageData = await getFriends(page, true);
        data = [...data, ...pageData];
        page++;
        logMessage(`Loaded ${data.length} friends so far...`);
        if (pageData.length === 0) {
            break;
        }
    }

    page = 0;
    while(true) {
        const pageData = await getFriends(page, false);
        data = [...data, ...pageData];
        page++;
        logMessage(`Loaded ${data.length} friends so far...`);
        if (pageData.length === 0) {
            break;
        }
    }

    return data;
};

const getAllMutualData = async (friends) => {
    let data = {};
    let progress = 0;

    const promises = friends.map((friend) => limitFn(() => getMutualAllMutualFriendsOfFriend(friend.id).then(response => {
        data[friend.id] = response;
        progress++;
        logMessage(`Progress: ${progress} / ${friends.length}`);
    })));

    return Promise.all(promises).then(() => {
        Object.keys(data).forEach((key) => {
            if (data[key].length === 0) {
                delete data[key];
                return;
            }

            data[key] = data[key].map(user => user.id);
        })

        return data;
    });
}

const checkIfLoggedIn = async () => {
    return fetch("https://api.vrchat.cloud/api/1/auth/user", {
        method: "GET",
        credentials: "same-origin"
    }).then(res => res.json());
}

const submitLogin = async (username, password) => {
    return fetch("https://api.vrchat.cloud/api/1/auth/user", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Authorization": `Basic ${btoa(encodeURIComponent(username) + ':' + encodeURIComponent(password))}`
        }
    }).then(res => res.json());
}

const submitSecondFactor = async (secondFactor) => {
    const body = JSON.stringify({
        "code": secondFactor
    });

    return fetch("https://api.vrchat.cloud/api/1/auth/twofactorauth/totp/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body
    }).then(res => res.json());
};

const logout = async () => {
    await fetch("https://api.vrchat.cloud/api/1/logout", {
        method: "PUT",
        credentials: "same-origin"
    });
}

const logMessage = (message) => {
    const logDiv = document.getElementById('log');
    const time = new Date().toLocaleTimeString();
    logDiv.innerHTML += `[${time}] ${message}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

const copyTextToClipboard = (text) => {
    if (!window.navigator.clipboard) {
        console.log(text);
        console.error('Unable to copy text to clipboard, printed above');
    } else {
        window.navigator.clipboard
            .writeText(text)
            .then()
            .catch(error => {
                console.log(text);
                console.error('Unable to copy text to clipboard: ', error)
            });
    }
}

const showInitialLoadingUi = () => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `<h1>Loading...</h1>`;
}

const showLoginFormUi = () => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <h1>Login to your VRChat account:</h1>
        <form>
            <div id="login-main">
                <label> <span>Username:</span> <input type="text" id="username"> </label>
                <label> <span>Password:</span> <input type="password" id="password"> </label>
            </div>
            <div id="login-second-factor" style="display: none;">
                <label> <span>Second factor:</span> <input type="text" id="second-factor"> </label>                
            </div>
            <button type="button" id="submit">Submit</button>
        </form>
    `;

    let secondFactorPhase = false;

    document.getElementById('username').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submit').click();
        }
    });

    document.getElementById('password').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submit').click();
        }
    });

    document.getElementById('second-factor').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submit').click();
        }
    });

    document.getElementById('username').focus();

    document.getElementById('submit').addEventListener('click', async () => {
        if (!secondFactorPhase) {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            document.getElementById('submit').disabled = true;

            logMessage('Logging in...');
            const data = await submitLogin(username, password);
            document.getElementById('submit').disabled = false;

            if (data.error) {
                logMessage(`Login failed: ${data.error.message}`);
                return;
            }

            if (data.requiresTwoFactorAuth) {
                logMessage(`Login requires second factor.`);
                secondFactorPhase = true;
                document.getElementById('login-main').style.display = 'none';
                document.getElementById('login-second-factor').style.display = 'block';
                document.getElementById('second-factor').focus();
                return;
            }

            document.getElementById('submit').disabled = true;
            showMainUi(await checkIfLoggedIn());
        } else {
            const secondFactor = document.getElementById('second-factor').value;
            document.getElementById('submit').disabled = true;

            logMessage('Submitting second factor...');
            const data = await submitSecondFactor(secondFactor);
            document.getElementById('submit').disabled = false;

            if (data.error) {
                logMessage(`Second factor failed: ${data.error.message}`);
                return;
            }

            if (data.verified === false) {
                logMessage(`Second factor failed: Incorrect code`);
                return;
            }

            document.getElementById('submit').disabled = true;
            showMainUi(await checkIfLoggedIn());
        }
    });
}

const showMainUi = (currentUserData) => {
    logMessage('Logged in.');

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <h1>Welcome, ${currentUserData.displayName}!</h1>
        <button type="button" id="logout">Logout</button>
        <br><br>
        
        <button type="button" id="load-friends">Load Friends and Mutuals</button>
        <br><br>
        
        <button type="button" id="copy-to-clipboard" style="visibility: hidden">Copy Data to Clipboard</button>
    `;

    let clipboardData = {
        currentUser: {},
        friends: [],
        mutuals: {},
    };

    document.getElementById('logout').addEventListener('click', async () => {
        document.getElementById('logout').disabled = true;
        document.getElementById('load-friends').disabled = true;
        await logout();

        logMessage('Logged out.');
        showLoginFormUi();
    });

    document.getElementById('load-friends').addEventListener('click', async () => {
        document.getElementById('logout').disabled = true;
        document.getElementById('load-friends').disabled = true;

        logMessage('Loading all friends...');
        const friends = await getAllFriends();
        logMessage(`Loaded ${friends.length} friends.`);

        logMessage('Loading mutual friends data...');
        const mutualData = await getAllMutualData(friends);
        logMessage('Loaded mutual friends data.');
        document.getElementById('copy-to-clipboard').style.visibility = 'visible';

        document.getElementById('logout').disabled = false;
        document.getElementById('load-friends').disabled = false;

        clipboardData = {
            currentUser: currentUserData,
            friends,
            mutuals: mutualData,
        }
    });

    document.getElementById('copy-to-clipboard').addEventListener('click', async () => {
        copyTextToClipboard(JSON.stringify(clipboardData));
        logMessage('Data copied to clipboard, paste to main site.');
    })
}

const run = async () => {
    document.head.innerHTML += `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
    `
    document.head.innerHTML += `<style>${style}</style>`;
    document.body.innerHTML = `<div id="content"></div><div id="log"></div>`;

    showInitialLoadingUi();

    let currentUserData = undefined;

    try {
        logMessage('Initializing...');
        currentUserData = await checkIfLoggedIn();
    } catch (error) {}

    await import('https://esm.run/p-limit').then(m => pLimit = m.default);
    limitFn = pLimit(10);

    if (!currentUserData || !!currentUserData.error || !!currentUserData.requiresTwoFactorAuth) {
        if (!!currentUserData?.requiresTwoFactorAuth) {
            await logout();
        }

        logMessage('Login required.');
        showLoginFormUi();
    } else {
        logMessage('Found user data session, logging in...');
        showMainUi(currentUserData);
    }
};

run();