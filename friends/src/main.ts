import { Data } from './types';
import { createGraph } from './graph';

const input = document.getElementById('input') as HTMLInputElement;
const loadButton = document.getElementById('load-button');
const clearDataButton = document.getElementById('clear-data');
const togglePicsButton = document.getElementById('toggle-pics');
const searchInput = document.getElementById('search');

input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        loadButton?.click();
    }
});

loadButton?.addEventListener('click', () => {
    let data = null;
    try {
        data = JSON.parse(input.value);
        if (!data) {
            throw new Error('No data found.');
        }

        if (!data.currentUser) {
            throw new Error('Could not find user data.');
        }

        if (!data.friends) {
            throw new Error('Could not find friends data.');
        }

        if (!data.mutuals) {
            throw new Error('Could not find mutuals data.');
        }
    } catch (e) {
        alert('Invalid JSON data. Please check your input.');
        return;
    }

    localStorage.setItem('vrchat-friends-data', JSON.stringify(data));
    start();
});

clearDataButton?.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
});

togglePicsButton?.addEventListener('click', () => {
    document.getElementById('img-tmp')!.style.visibility =
        document.getElementById('img-tmp')!.style.visibility === 'hidden' ? 'visible' : 'hidden';
});

searchInput!.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        (searchInput as HTMLInputElement).value = '';
    }
});

const start = () => {
    const storedData = localStorage.getItem('vrchat-friends-data');
    let parsedStoredData: null | Data = null;
    if (!storedData) {
        document.getElementById('content')!.style.display = 'block';
        return;
    }

    try {
        parsedStoredData = JSON.parse(storedData) as Data | null;
        if (!storedData) {
            throw new Error('No data found.');
        }

        if (!parsedStoredData?.currentUser) {
            throw new Error('Could not find user data.');
        }

        if (!parsedStoredData?.friends) {
            throw new Error('Could not find friends data.');
        }

        if (!parsedStoredData?.mutuals) {
            throw new Error('Could not find mutuals data.');
        }
    } catch (e) {
        document.getElementById('content')!.style.display = 'block';
        return;
    }

    document.getElementById('content')!.innerHTML = ``;
    document.getElementById('content')!.style.display = 'block';
    clearDataButton!.style.display = 'block';
    togglePicsButton!.style.display = 'block';
    searchInput!.style.display = 'block';

    if (parsedStoredData) {
        createGraph(parsedStoredData);
    }
};

start();
