require('dotenv').config(); // .envファイルを読み込む

const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors'); // CORSミドルウェアを追加
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini SDKをインポート
const pinataSDK = require('@pinata/sdk'); // Pinata SDKをインポート
const { Readable } = require('stream'); // Readableストリームを使用

const app = express();
const port = 8888;

// 環境変数からクライアントIDとクライアントシークレットを読み込む
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const geminiApiKey = process.env.GEMINI_API_KEY; // Gemini APIキーを読み込む
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

// Spotify Developer Dashboardに登録したリダイレクトURIと一致させる
const redirectUri = 'http://127.0.0.1:5500/index.html'; 

const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri,
});

// Gemini APIクライアントを初期化
const genAI = new GoogleGenerativeAI(geminiApiKey);
// テキストと画像生成の両方にgemini-2.0-flash-preview-image-generationを使用
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" }); 

// Pinataクライアントを初期化
const pinata = new pinataSDK(pinataApiKey, pinataSecretApiKey);

// CORSを有効にする (フロントエンドからのリクエストを許可するため)
app.use(cors());
app.use(express.json({ limit: '10mb' })); // JSONボディをパースするため & 画像データのために上限を増やす

// フロントエンドから認証コードを受け取り、トークンを交換するエンドポイント
app.post('/exchange-token', (req, res) => {
  const code = req.body.code;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing.' });
  }

  spotifyApi.authorizationCodeGrant(code)
    .then(data => {
      // アクセストークンとリフレッシュトークンをフロントエンドに返す
      res.json({
        accessToken: data.body['access_token'],
        refreshToken: data.body['refresh_token'],
        expiresIn: data.body['expires_in'],
        // ユーザー情報を取得して返す
        userId: data.body['user_id'], // Spotify APIからユーザーIDを取得
      });
    })
    .catch(err => {
      console.error('Error during token exchange:', err);
      res.status(500).json({ error: 'Failed to exchange token.' });
    });
});

// Endpoint to search for tracks
app.get('/search-tracks', (req, res) => {
  const query = req.query.q;
  const accessToken = req.query.accessToken; // フロントエンドからアクセストークンを受け取る

  if (!query) {
    return res.status(400).send('Search query is required.');
  }
  if (!accessToken) {
    return res.status(401).send('Access token is required.');
  }

  spotifyApi.setAccessToken(accessToken); // 受け取ったアクセストークンを設定

  spotifyApi.searchTracks(query, { limit: 10 })
    .then(data => {
      res.json(data.body);
    })
    .catch(err => {
      console.error('Error searching tracks:', err);
      res.status(500).send('Error searching tracks');
    });
});

// Geminiからの応答を解析する共通関数
const parseGeminiResponse = (responseText) => {
    if (!responseText) return {};
    const data = {
        emotypeName: '',
        colorPalette: [],
        emotionalProfile: '',
        poeticStatement: '',
        keywordTags: [],
        sourcePlaylistComment: ''
    };

    const keyMap = {
        'EMOTYPE_NAME:': 'emotypeName',
        'COLOR_PALETTE:': 'colorPalette',
        'EMOTIONAL_PROFILE:': 'emotionalProfile',
        'POETIC_STATEMENT:': 'poeticStatement',
        'KEYWORD_TAGS:': 'keywordTags',
        'SOURCE_PLAYLIST_COMMENT:': 'sourcePlaylistComment'
    };
    const labels = Object.keys(keyMap);

    let lines = responseText.split('\n');

    // 応答から、期待するラベルが最初に現れる行を探す
    const firstLabelIndex = lines.findIndex(line => labels.some(label => line.startsWith(label)));

    // ラベルが見つからなかった場合、または応答が空の場合は、空のデータを返す
    if (firstLabelIndex === -1) {
        return data;
    }

    // 最初のラベル行より前の不要な部分をすべて破棄する
    lines = lines.slice(firstLabelIndex);

    // END_OF_ANALYSISマーカー以降の行を削除
    const endMarkerIndex = lines.indexOf('--- END_OF_ANALYSIS ---');
    if (endMarkerIndex !== -1) {
        lines = lines.slice(0, endMarkerIndex);
    }

    // 画像生成に関する説明文を削除
    const imageDescriptionMarkers = [
        "私は、上記の分析に基づき、",
        "抽象的な画像を生成します。"
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        for (const marker of imageDescriptionMarkers) {
            if (line.startsWith(marker)) {
                lines = lines.slice(0, i); // マーカーが見つかった行から後ろを削除
                break; // 内側のループを抜ける
            }
        }
        if (lines.length <= i) break; // 行が削除された場合、外側のループも抜ける
    }

    let currentSectionKey = null;

    for (const line of lines) {
        let isLabel = false;
        for (const label of labels) {
            if (line.startsWith(label)) {
                currentSectionKey = keyMap[label];
                const content = line.substring(label.length).trim();
                
                if (currentSectionKey === 'colorPalette' || currentSectionKey === 'keywordTags') {
                    data[currentSectionKey] = content.split(',').map(s => s.trim()).filter(s => s);
                } else {
                    data[currentSectionKey] = content;
                }
                isLabel = true;
                break;
            }
        }

        if (!isLabel && currentSectionKey) {
            // ラベル行でない場合は、直前のセクションの続きとみなし、改行して追加する
            if (['emotionalProfile', 'poeticStatement', 'sourcePlaylistComment'].includes(currentSectionKey)) {
                 if (data[currentSectionKey]) {
                    data[currentSectionKey] += '\n' + line;
                 } else {
                    data[currentSectionKey] = line;
                 }
            }
        }
    }
    
    // 最終的な結果から不要な空白を削除
    for(const key in data) {
        if (typeof data[key] === 'string') {
            data[key] = data[key].trim();
        }
    }

    return data;
};


// エンドポイント: 詩と画像を生成する
app.post('/generate-poem', async (req, res) => {
  const selectedTracks = req.body.tracks;

  if (!selectedTracks || selectedTracks.length === 0) {
    return res.status(400).json({ error: 'No tracks provided for poem generation.' });
  }

  try {
    const trackInfo = selectedTracks.map(track => `曲名: ${track.name}, アーティスト: ${track.artist}`).join('\n');
    const combinedPrompt = `以下の10曲から、ユーザーの深層心理を分析し、その結果を基に「感情の詩」と、その感情を象徴する抽象的な画像を生成してください.

出力は以下のフォーマットに従ってください。各セクションは指定されたラベルで始めてください。

EMOTYPE_NAME: [ここにEmotype名を記述。例: 蒼き情熱の旋律]
COLOR_PALETTE: [プライマリカラーのHEXコード], [セカンダリカラーのHEXコード], [アクセントカラーのHEXコード] (例: #FF0000, #00FF00, #0000FF)
EMOTIONAL_PROFILE:
1. 情緒トーン分布（喜怒哀楽／希望／諦観／ノスタルジアなどの含有割合）
2. 認知スタンス傾向（内向／外向、理性／感性、分析型／感受型など）
3. 感情処理パターン（共鳴型／昇華型／放流型など）
4. 時間指向（過去回帰／現在肯定／未来投影のどれが多いか）
5. 言語vs音感応性（歌詞に引かれるか、音で感じるタイプか）
6. 他者との関係性傾向（共鳴欲求／孤独志向／承認衝動など）
POETIC_STATEMENT: [ここに詩的なステートメントを記述。複数行可]
KEYWORD_TAGS: [キーワード1], [キーワード2], [キーワード3] (例: 希望, 内省, 躍動)
SOURCE_PLAYLIST_COMMENT: [ここにソースプレイリストに関するコメントを記述。例: このプレイリストは、ユーザーの多面的な感情と成長の軌跡を映し出しています。]
--- END_OF_ANALYSIS ---

--- 選択された曲 ---
${trackInfo}

【画像生成指示】
Emotion Cardの表面に使用する、**抽象的かつ芸術的な正方形のビジュアル画像**を生成してください。
以下の分析結果（Emotypeタイトル、感情カラーパレット、キーワード）をもとに、感情の印象を視覚的に表現してください。

【必須条件】
- ✅ 画像のアートスタイルは**抽象表現（アブストラクトアート）**であること
- ✅ 画像の縦横比は**正方形（1:1）**にしてください（例：1024×1024px）

【禁止事項】
-  **人物・動物・身体のパーツを描かないこと**
  （顔・手・シルエットなど、人を連想させる形状を含めない）
-  **文字・記号・数字などを一切含めないこと**
  （タイトルやタグは画像外に表示するため、画像内には一切表示しない）

【表現の方針】
- ✅ 色は、指定された**感情カラーパレット（例：淡青＋ライラック＋グレーなど）**をベースに構成してください
- ✅ 抽象的な形・構造・グラデーション・層構造・粒子・ぼかし等を自由に使って、
  感情トーンや認知傾向を**視覚的印象として表現**してください
- ✅ 特定の意味やモチーフを描かなくて構いません。「感じられる」ことを優先してください`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const response = await result.response;
    
    let textData = null;
    let imageData = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        textData = part.text;
      } else if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        imageData = part.inlineData.data;
      }
    }

    // 画像生成指示をテキストデータから削除
    const imageInstructionMarker = "抽象的な画像を生成するための指示:";
    const markerIndex = textData.indexOf(imageInstructionMarker);
    if (markerIndex !== -1) {
        textData = textData.substring(0, markerIndex).trim();
    }

    console.log('Raw Gemini Text Data:', textData); // 追加
    console.log('Raw Gemini Image Data (present/absent):', imageData ? 'Present' : 'Absent'); // 追加

    const parsedData = parseGeminiResponse(textData);

    // 解析データと画像データ(base64)をフロントエンドに返す
    res.json({ ...parsedData, imageData: imageData });

  } catch (error) {
    console.error('Error generating content with Gemini API:', error);
    res.status(500).json({ error: 'Failed to generate content.' });
  }
});

// エンドポイント: ミント準備のためにIPFSにアップロードする
app.post('/prepare-for-mint', async (req, res) => {
    const { cardData, imageData } = req.body;

    if (!cardData) {
        return res.status(400).json({ error: 'Card data is missing.' });
    }

    try {
        let imageIpfsUrl = ""; // デフォルトは空

        // imageDataが存在する場合のみ画像をIPFSにアップロード
        if (imageData) {
            const imageBuffer = Buffer.from(imageData, 'base64');
            const imageStream = Readable.from(imageBuffer);
            const imageName = `emotion_card_${Date.now()}.jpeg`;
            imageStream.path = imageName;

            const imageUploadResult = await pinata.pinFileToIPFS(imageStream, { pinataMetadata: { name: imageName } });
            imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageUploadResult.IpfsHash}`;
        }

        // NFTメタデータJSONを構築
        const nftMetadata = {
            name: cardData.emotypeName || "Emotion Card",
            description: cardData.poeticStatement || "A unique Emotion Card generated from your music.",
            image: imageIpfsUrl,
            attributes: [
                { trait_type: "Emotype Name", value: cardData.emotypeName || "N/A" },
                { trait_type: "Color Palette", value: (cardData.colorPalette && cardData.colorPalette.length > 0) ? cardData.colorPalette.join(', ') : "N/A" },
                { trait_type: "Emotional Profile", value: cardData.emotionalProfile || "N/A" },
                { trait_type: "Poetic Statement", value: cardData.poeticStatement || "N/A" },
                { trait_type: "Keyword Tags", value: (cardData.keywordTags && cardData.keywordTags.length > 0) ? cardData.keywordTags.join(', ') : "N/A" },
                { trait_type: "Source Playlist Comment", value: cardData.sourcePlaylistComment || "N/A" },
            ],
        };

        // メタデータJSONをIPFSにアップロード
        const jsonUploadResult = await pinata.pinJSONToIPFS(nftMetadata, { pinataMetadata: { name: `metadata_${Date.now()}.json` } });
        const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${jsonUploadResult.IpfsHash}`;

        res.json({ metadataIpfsUrl: metadataIpfsUrl });

    } catch (error) {
        console.error('Error preparing for minting:', error);
        res.status(500).json({ error: 'Failed to upload to IPFS.' });
    }
});


// フロントエンドにclientIdを提供するエンドポイント
app.get('/config', (req, res) => {
  res.json({ clientId: clientId });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});