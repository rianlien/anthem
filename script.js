document.addEventListener('DOMContentLoaded', () => {
    const spotifyLoginBtn = document.getElementById('login-spotify-btn');
    const searchInput = document.getElementById('search-input');
    const searchResultsDiv = document.getElementById('search-results');
    const selectedTracksDiv = document.getElementById('selected-tracks');
    const selectedCountSpan = document.getElementById('selected-count');
    const createCardBtn = document.getElementById('create-card-btn');
    const selectionScreen = document.getElementById('selection-screen');
    const resultScreen = document.getElementById('result-screen');
    const backBtn = document.getElementById('back-btn');
    const issueSbtBtn = document.getElementById('issue-sbt-btn'); // SBT発行ボタン
    const connectWalletBtns = document.querySelectorAll('#connect-wallet-btn'); // Connect Walletボタン (複数対応)

    // Emotion Card本体の要素
    const emotionCardContainer = document.getElementById('emotion-card-container');
    const cardTitle = document.getElementById('card-title');
    const emotionCardImage = document.getElementById('emotion-card-image'); // 画像要素を追加

    // 分析テキストエリアの要素
    const analysisEmotypeName = document.getElementById('analysis-emotype-name');
    const analysisColorPalette = document.getElementById('analysis-color-palette');
    const analysisEmotionalProfile = document.getElementById('analysis-emotional-profile');
    const analysisPoeticStatement = document.getElementById('analysis-poetic-statement');
    const analysisKeywordTags = document.getElementById('analysis-keyword-tags');
    const analysisSourcePlaylistComment = document.getElementById('analysis-source-playlist-comment');

    let selectedTracks = [];
    let accessToken = null; // Spotifyのアクセストークンを保持
    let clientId = null; // バックエンドから取得する
    let currentAccount = null; // 接続中のウォレットアドレス
    let generatedCardData = null; // 生成されたカードのテキストデータを保持
    let generatedImageData = null; // 生成されたカードの画像データ(base64)を保持

    // Polygon Amoy Testnetのコントラクト情報
    const CONTRACT_ADDRESS = "0x726B87457802e2Ea8BF3cB384A0E6CB18927b0B1"; // デプロイしたコントラクトアドレス
    const CONTRACT_ABI = [
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "symbol",
              "type": "string"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "approved",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "Approval",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "ApprovalForAll",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "_fromTokenId",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "_toTokenId",
              "type": "uint256"
            }
          ],
          "name": "BatchMetadataUpdate",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "_tokenId",
              "type": "uint256"
            }
          ],
          "name": "MetadataUpdate",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "Transfer",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "balanceOf",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "getApproved",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            }
          ],
          "name": "isApprovedForAll",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "uri",
              "type": "string"
            }
          ],
          "name": "mint",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "name",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "ownerOf",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "renounceOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "safeTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "name": "safeTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "setApprovalForAll",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "_tokenURI",
              "type": "string"
            }
          ],
          "name": "setTokenURI",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes4",
              "name": "interfaceId",
              "type": "bytes4"
            }
          ],
          "name": "supportsInterface",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "symbol",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "tokenURI",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "totalSupply",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "transferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

    // SpotifyのリダイレクトURI
    const redirectUri = 'http://127.0.0.1:5500/index.html';

    // ページロード時に設定（clientId）を取得する関数
    async function fetchConfig() {
        try {
            const response = await fetch('http://localhost:8888/config');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            clientId = config.clientId;
            console.log('Client ID loaded:', clientId);

            // clientIdが取得できたら、認証コードのチェックとログインボタンの有効化を行う
            checkAuthCodeAndEnableLogin();
        } catch (error) {
            console.error('Error fetching config:', error);
            alert('アプリケーション設定の取得に失敗しました。ページをリロードしてください。');
        }
    }

    // 認証コードのチェックとログインボタンの有効化を行う関数
    function checkAuthCodeAndEnableLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            // 認証コードがあれば、バックエンドに送ってトークンを交換
            exchangeCodeForToken(code);
            // URLから認証コードを削除してクリーンにする
            window.history.pushState({}, document.title, window.location.pathname);
        }

        // clientIdが取得できたらログインボタンを有効化
        if (spotifyLoginBtn && clientId) {
            spotifyLoginBtn.disabled = false; // 必要であればボタンを有効化
        }
    }

    // ページロード時に設定を取得
    fetchConfig();

    // ページロード時にサイレントにウォレット接続を試みる
    silentlyConnectWallet();

    // Spotifyログインボタンのイベントリスナー
    if (spotifyLoginBtn) {
        spotifyLoginBtn.addEventListener('click', () => {
            if (!clientId) {
                alert('クライアントIDがまだ読み込まれていません。しばらくお待ちください。');
                return;
            }
            const scopes = 'user-read-private user-read-email user-top-read playlist-modify-public';
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
        });
    }

    // 認証コードをバックエンドに送ってトークンを取得する関数
    async function exchangeCodeForToken(code) {
        try {
            const response = await fetch('http://localhost:8888/exchange-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            accessToken = data.accessToken;
            console.log('Access Token:', accessToken);
            alert('Spotifyにログインしました！');
            // ここでUIを更新して、ログイン状態を示すなど
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            alert('Spotifyログインに失敗しました。');
        }
    }

    // 検索入力フィールドのイベントリスナー
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;
            if (query.length > 2) { // 2文字以上で検索開始
                searchTimeout = setTimeout(() => {
                    searchTracks(query);
                }, 500);
            } else {
                searchResultsDiv.innerHTML = '<p class="text-zinc-500 text-center p-4">検索を開始してください</p>';
            }
        });
    }

    // 曲を検索する関数
    async function searchTracks(query) {
        if (!accessToken) {
            alert('Spotifyにログインしてください。');
            return;
        }
        try {
            // アクセストークンをクエリパラメータとしてバックエンドに送信
            const response = await fetch(`http://localhost:8888/search-tracks?q=${encodeURIComponent(query)}&accessToken=${accessToken}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            displaySearchResults(data.tracks.items);
        } catch (error) {
            console.error('Error searching tracks:', error);
            searchResultsDiv.innerHTML = '<p class="text-red-500 text-center p-4">検索中にエラーが発生しました。</p>';
        }
    }

    // 検索結果を表示する関数
    function displaySearchResults(tracks) {
        searchResultsDiv.innerHTML = '';
        if (tracks.length === 0) {
            searchResultsDiv.innerHTML = '<p class="text-zinc-500 text-center p-4">一致する曲が見つかりませんでした。</p>';
            return;
        }

        tracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'flex items-center justify-between bg-zinc-800 p-2 rounded-lg';
            trackElement.innerHTML = `
                <div class="flex items-center">
                    <img src="${track.album.images[0]?.url || ''}" alt="Album Art" class="w-10 h-10 rounded mr-3">
                    <div>
                        <p class="text-white font-semibold">${track.name}</p>
                        <p class="text-zinc-400 text-sm">${track.artists.map(artist => artist.name).join(', ')}</p>
                    </div>
                </div>
                <button class="add-track-btn bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700" data-track-id="${track.id}" data-track-name="${track.name}" data-artist-name="${track.artists.map(artist => artist.name).join(', ')}" data-album-art="${track.album.images[0]?.url || ''}">
                    追加
                </button>
            `;
            searchResultsDiv.appendChild(trackElement);
        });

        selectedCountSpan.textContent = selectedTracks.length;

        // 「追加」ボタンのイベントリスナー
        searchResultsDiv.querySelectorAll('.add-track-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackId = e.target.dataset.trackId;
                const trackName = e.target.dataset.trackName;
                const artistName = e.target.dataset.artistName;
                const albumArt = e.target.dataset.albumArt;

                addTrackToSelection({ id: trackId, name: trackName, artist: artistName, albumArt: albumArt });
            });
        });
    }

    // 選択リストに曲を追加する関数
    function addTrackToSelection(track) {
        if (selectedTracks.length >= 10) {
            alert('選択できる曲は10曲までです。');
            return;
        }
        if (selectedTracks.some(t => t.id === track.id)) {
            alert('この曲はすでに選択されています。');
            return;
        }

        selectedTracks.push(track);
        updateSelectedTracksDisplay();
    }

    // 選択リストから曲を削除する関数
    function removeTrackFromSelection(trackId) {
        selectedTracks = selectedTracks.filter(track => track.id !== trackId);
        updateSelectedTracksDisplay();
    }

    // 選択リストの表示を更新する関数
    function updateSelectedTracksDisplay() {
        selectedTracksDiv.innerHTML = '';
        if (selectedTracks.length === 0) {
            selectedTracksDiv.innerHTML = '<p class="text-zinc-500 text-center p-4">ここに曲が追加されます</p>';
        }

        selectedTracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'flex items-center justify-between bg-zinc-800 p-2 rounded-lg';
            trackElement.innerHTML = `
                <div class="flex items-center">
                    <img src="${track.albumArt}" alt="Album Art" class="w-10 h-10 rounded mr-3">
                    <div>
                        <p class="text-white font-semibold">${track.name}</p>
                        <p class="text-zinc-400 text-sm">${track.artist}</p>
                    </div>
                </div>
                <button class="remove-track-btn bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700" data-track-id="${track.id}">
                    削除
                </button>
            `;
            selectedTracksDiv.appendChild(trackElement);
        });

        selectedCountSpan.textContent = selectedTracks.length;

        // 「Emotion Cardを作成」ボタンの有効/無効を切り替え
        if (selectedTracks.length === 10) {
            createCardBtn.disabled = false;
            createCardBtn.classList.remove('bg-purple-600/50', 'cursor-not-allowed');
            createCardBtn.classList.add('bg-purple-600');
        } else {
            createCardBtn.disabled = true;
            createCardBtn.classList.add('bg-purple-600/50', 'cursor-not-allowed');
            createCardBtn.classList.remove('bg-purple-600');
        }

        // 「削除」ボタンのイベントリスナー
        selectedTracksDiv.querySelectorAll('.remove-track-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackId = e.target.dataset.trackId;
                removeTrackFromSelection(trackId);
            });
        });
    }

    // 「Emotion Cardを作成」ボタンのイベントリスナー
    if (createCardBtn) {
        createCardBtn.addEventListener('click', async () => {
            if (selectedTracks.length === 10) {
                // ボタンを無効化し、ローディング表示を追加
                createCardBtn.disabled = true;
                createCardBtn.textContent = '生成中...';
                createCardBtn.classList.add('opacity-50', 'cursor-not-allowed');

                try {
                    const response = await fetch('http://localhost:8888/generate-poem', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ tracks: selectedTracks }),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    // 生成されたデータを保存
                    generatedCardData = data;
                    generatedImageData = data.imageData; // base64画像データ

                    // Emotion CardのUIを更新
                    updateCardDisplay(data);

                    // 画面を切り替える
                    selectionScreen.classList.add('hidden');
                    resultScreen.classList.remove('hidden');

                } catch (error) {
                    console.error('Error generating emotion card:', error);
                    alert('Emotion Cardの生成中にエラーが発生しました。' + error.message);
                } finally {
                    // 処理が完了したらボタンを元に戻す
                    createCardBtn.disabled = false;
                    createCardBtn.textContent = 'Emotion Cardを作成';
                    createCardBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            } else {
                alert('10曲選択してください。');
            }
        });
    }

    // カード表示を更新する関数
    function updateCardDisplay(data) {
        const imageFallbackMessage = document.getElementById('image-fallback-message');

        cardTitle.textContent = data.emotypeName || 'Emotion Card';
        if (data.imageData) {
            emotionCardImage.src = `data:image/jpeg;base64,${data.imageData}`;
            emotionCardImage.style.display = 'block';
            emotionCardContainer.style.background = '';
            imageFallbackMessage.classList.add('hidden'); // 画像がある場合はメッセージを非表示
        } else {
            emotionCardImage.src = '';
            emotionCardImage.style.display = 'none';
            emotionCardContainer.style.background = 'linear-gradient(45deg, #C084FC, #4F46E5)';
            imageFallbackMessage.classList.remove('hidden'); // 画像がない場合はメッセージを表示
        }

        analysisEmotypeName.textContent = data.emotypeName || 'N/A';
        analysisColorPalette.innerHTML = '';
        if (data.colorPalette && data.colorPalette.length > 0) {
            data.colorPalette.forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'w-6 h-6 rounded-full border border-zinc-700';
                colorDiv.style.backgroundColor = color;
                analysisColorPalette.appendChild(colorDiv);
            });
        } else {
            analysisColorPalette.textContent = 'N/A';
        }
        analysisEmotionalProfile.textContent = data.emotionalProfile || 'N/A';
        analysisPoeticStatement.textContent = data.poeticStatement || 'N/A';
        analysisKeywordTags.textContent = (data.keywordTags && data.keywordTags.length > 0) ? data.keywordTags.join(', ') : 'N/A';
        analysisSourcePlaylistComment.textContent = data.sourcePlaylistComment || 'N/A';
    }

    // ウォレット接続
    connectWalletBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const accounts = await provider.send("eth_requestAccounts", []);
                    currentAccount = accounts[0];
                    updateWalletButtons(); // ボタン表示を更新
                    alert('ウォレットが接続されました！');
                } catch (error) {
                    console.error('Error connecting to MetaMask:', error);
                    alert('MetaMaskへの接続に失敗しました。');
                }
            } else {
                alert('MetaMaskがインストールされていません。インストールしてください。');
            }
        });
    });

    // ウォレットボタンの表示を更新する関数
    function updateWalletButtons() {
        if (currentAccount) {
            const buttonText = `Connected: ${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`;
            connectWalletBtns.forEach(btn => btn.textContent = buttonText);
        } else {
            connectWalletBtns.forEach(btn => btn.textContent = 'Connect Wallet');
        }
    }

    // ページロード時に、ユーザーの操作なしでウォレット接続を試みる関数
    async function silentlyConnectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                // 既に接続が許可されているか確認
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    // 許可されていれば、アカウント情報を設定してUIを更新
                    currentAccount = accounts[0];
                    updateWalletButtons();
                    console.log('Wallet connected silently.');
                }
            } catch (error) {
                console.error('Silent wallet connection failed:', error);
            }
        }
    }

    // 「SBTとして発行する」ボタンのイベントリスナー
    if (issueSbtBtn) {
        issueSbtBtn.addEventListener('click', async () => {
            console.log('Issue SBT button clicked.'); // Log: ボタンクリックを記録

            if (!generatedCardData) {
                alert('まずEmotion Cardを生成してください。');
                console.error('SBT Minting failed: generatedCardData is missing.');
                return;
            }
            if (!currentAccount) {
                alert('ウォレットを接続してください。');
                console.error('SBT Minting failed: currentAccount is missing.');
                return;
            }

            console.log('Preparing for minting...', { cardData: generatedCardData, imageData: generatedImageData ? 'Image data present' : 'No image data' });

            try {
                // 1. IPFSへのアップロードとメタデータURLの取得
                const prepResponse = await fetch('http://localhost:8888/prepare-for-mint', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        cardData: generatedCardData, 
                        imageData: generatedImageData 
                    }),
                });

                console.log('Response from /prepare-for-mint:', prepResponse.status);

                if (!prepResponse.ok) {
                    const errorText = await prepResponse.text();
                    throw new Error(`HTTP error! status: ${prepResponse.status}, body: ${errorText}`);
                }
                const { metadataIpfsUrl } = await prepResponse.json();

                console.log('Received metadata URL:', metadataIpfsUrl);

                if (!metadataIpfsUrl) {
                    throw new Error('Failed to get metadata URL from server.');
                }

                // 2. スマートコントラクトを呼び出してミント
                console.log('Calling smart contract to mint...');
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const soulboundNFT = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                const tx = await soulboundNFT.mint(currentAccount, metadataIpfsUrl);
                await tx.wait();

                alert(`SBTが正常に発行されました！トランザクションハッシュ: ${tx.hash}`);
                console.log('Minted SBT with transaction hash:', tx.hash);

            } catch (error) {
                console.error('Error minting SBT:', error);
                alert(`SBTの発行に失敗しました。エラー: ${error.message}`);
            }
        });
    }

    // 「戻る」ボタンのイベントリスナー
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            resultScreen.classList.add('hidden');
            selectionScreen.classList.remove('hidden');
        });
    }

    // 初期表示の更新
    updateSelectedTracksDisplay();
});