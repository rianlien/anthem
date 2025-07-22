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
app.use(express.json()); // JSONボディをパースするため

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

// 新しいエンドポイント: 詩と画像を生成し、IPFSにアップロードする
app.post('/generate-poem', async (req, res) => { // asyncを追加
  const selectedTracks = req.body.tracks; // フロントエンドから選択された曲のリストを受け取る

  if (!selectedTracks || selectedTracks.length === 0) {
    return res.status(400).json({ error: 'No tracks provided for poem generation.' });
  }

  try {
    // 選択された曲の情報を整形してプロンプトを作成
    const trackInfo = selectedTracks.map(track => `曲名: ${track.name}, アーティスト: ${track.artist}`).join('\n');

    // テキストと画像生成のための結合されたプロンプト
    const combinedPrompt = `以下の10曲から、ユーザーの深層心理を分析し、その結果を基に「感情の詩」と、その感情を象徴する抽象的な画像を生成してください。

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

--- 選択された曲 ---
${trackInfo}

抽象的な画像を生成するための指示: 上記の分析結果とキーワード、カラーパレットを参考に、抽象的で芸術的な画像を生成してください。`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'], // テキストと画像の両方を要求
      },
    });

    const response = await result.response;
    
    let textData = null;
    let imageData = null;

    // 応答からテキストと画像データを抽出
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        textData = part.text;
      } else if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        imageData = part.inlineData.data;
      }
    }

    // Geminiからの応答を解析
    const parseGeminiResponse = (responseText) => {
      const data = {};
      const lines = responseText.split('\n');
      let currentSection = '';
      let profileText = [];

      // 画像生成指示の開始を示す文字列
      const imageInstructionStart = '抽象的な画像を生成するための指示:';
      const imageInstructionIndex = responseText.indexOf(imageInstructionStart);

      let textToParse = responseText;
      if (imageInstructionIndex !== -1) {
        // 画像生成指示以降のテキストを削除
        textToParse = responseText.substring(0, imageInstructionIndex).trim();
      }

      const parsedLines = textToParse.split('\n');

      for (const line of parsedLines) {
        if (line.startsWith('EMOTYPE_NAME:')) {
          data.emotypeName = line.replace('EMOTYPE_NAME:', '').trim();
          currentSection = '';
        } else if (line.startsWith('COLOR_PALETTE:')) {
          data.colorPalette = line.replace('COLOR_PALETTE:', '').trim().split(',').map(c => c.trim());
          currentSection = '';
        } else if (line.startsWith('EMOTIONAL_PROFILE:')) {
          currentSection = 'EMOTIONAL_PROFILE';
        } else if (line.startsWith('POETIC_STATEMENT:')) {
          data.poeticStatement = line.replace('POETIC_STATEMENT:', '').trim();
          currentSection = 'POETIC_STATEMENT';
        } else if (line.startsWith('KEYWORD_TAGS:')) {
          data.keywordTags = line.replace('KEYWORD_TAGS:', '').trim().split(',').map(t => t.trim());
          currentSection = '';
        } else if (line.startsWith('SOURCE_PLAYLIST_COMMENT:')) {
          data.sourcePlaylistComment = line.replace('SOURCE_PLAYLIST_COMMENT:', '').trim();
          currentSection = 'SOURCE_PLAYLIST_COMMENT';
        } else {
          if (currentSection === 'EMOTIONAL_PROFILE') {
            profileText.push(line.trim());
          } else if (currentSection === 'POETIC_STATEMENT') {
            data.poeticStatement += '\n' + line.trim();
          }
        }
      }
      data.emotionalProfile = profileText.join('\n').trim();
      return data;
    };

    const parsedData = parseGeminiResponse(textData);

    // 画像データをBufferに変換
    const imageBuffer = Buffer.from(imageData, 'base64');
    const imageStream = Readable.from(imageBuffer);
    imageStream.path = `emotion_card_${Date.now()}.jpeg`; // ファイル名を指定

    // 画像をIPFSにアップロード
    const imageUploadResult = await pinata.pinFileToIPFS(imageStream, { pinataMetadata: { name: imageStream.path } });
    const imageIpfsHash = imageUploadResult.IpfsHash;
    const imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`;

    // NFTメタデータJSONを構築
    const nftMetadata = {
      name: parsedData.emotypeName || "Emotion Card",
      description: parsedData.poeticStatement || "A unique Emotion Card generated from your music.",
      image: imageIpfsUrl,
      attributes: [
        { trait_type: "Emotype Name", value: parsedData.emotypeName || "N/A" },
        { trait_type: "Color Palette", value: (parsedData.colorPalette && parsedData.colorPalette.length > 0) ? parsedData.colorPalette.join(', ') : "N/A" },
        { trait_type: "Emotional Profile", value: parsedData.emotionalProfile || "N/A" },
        { trait_type: "Poetic Statement", value: parsedData.poeticStatement || "N/A" },
        { trait_type: "Keyword Tags", value: (parsedData.keywordTags && parsedData.keywordTags.length > 0) ? parsedData.keywordTags.join(', ') : "N/A" },
        { trait_type: "Source Playlist Comment", value: parsedData.sourcePlaylistComment || "N/A" },
      ],
    };

    // メタデータJSONをIPFSにアップロード
    const jsonUploadResult = await pinata.pinJSONToIPFS(nftMetadata, { pinataMetadata: { name: `metadata_${Date.now()}.json` } });
    const metadataIpfsHash = jsonUploadResult.IpfsHash;
    const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;

    res.json({ ...parsedData, imageData: imageData, metadataIpfsUrl: metadataIpfsUrl }); // 解析データ、画像データ、メタデータURIを結合して返す

  } catch (error) {
    console.error('Error generating content or uploading to IPFS with Gemini API:', error);
    res.status(500).json({ error: 'Failed to generate content or upload to IPFS.' });
  }
});

// 新しいエンドポイント: フロントエンドにclientIdを提供する
app.get('/config', (req, res) => {
  res.json({ clientId: clientId });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
