# Emotion Card NFT

This project is a web application that analyzes a user's psyche based on their selected Spotify songs and visualizes it as an "Emotion Card." The generated "Emotion Card" can be issued on the blockchain as a non-transferable Soulbound NFT (SBT).

## Objective

The project aims to create a new form of digital identity by analyzing personal data like musical taste with AI and recording it as a non-transferable token on the blockchain.

## Key Technologies

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Music:** Spotify API (for song search and authentication)
- **AI:** Google Gemini API (for psychological analysis, poem, and image generation)
- **Blockchain:**
  - Solidity (Smart Contract Language)
  - Hardhat (Ethereum Development Environment)
  - Ethers.js (Ethereum Interaction Library)
  - Polygon Amoy Testnet (for testing)
- **Decentralized Storage:** IPFS (via Pinata) (for storing NFT metadata and images)

## Workflow

1.  **Spotify Login:** Users log in with their Spotify account to grant the application access to their song data.
2.  **Song Selection:** Users search for and select 10 of their favorite songs.
3.  **Emotion Card Generation:**
    - The information of the 10 selected songs is sent to the backend.
    - The backend calls the Google Gemini API to analyze the user's psyche based on the song list.
    - Gemini generates an analysis result including an Emotype name, color palette, emotional profile, a poetic statement, keyword tags, comments on the playlist, and an image symbolizing the emotion.
4.  **Upload to IPFS:**
    - The generated image and metadata (in JSON format) including the analysis results are uploaded to the decentralized storage IPFS.
5.  **Display Results:**
    - The "Emotion Card" is displayed on the frontend, showing the generated image and analysis.
6.  **Issue SBT (Optional):**
    - Users can connect their wallet (e.g., MetaMask).
    - By clicking the "Issue as SBT" button, a Soulbound NFT pointing to the metadata on IPFS is minted on the Polygon Amoy Testnet.

## Setup and Execution

### Prerequisites

- Node.js
- npm
- MetaMask Wallet

### Environment Variables

Create a `.env` file in the project root and add the following:

```
SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_CLIENT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PINATA_API_KEY=YOUR_PINATA_API_KEY
PINATA_SECRET_API_KEY=YOUR_PINATA_SECRET_API_KEY
POLYGON_AMOY_RPC_URL=YOUR_POLYGON_AMOY_RPC_URL
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY
```

### Running the Application

1.  **Install dependencies:**
    ```shell
    npm install
    ```
2.  **Start the backend server:**
    ```shell
    node server.js
    ```
3.  **Open the frontend:**
    Open the `index.html` file in your browser. Using an extension like Live Server is recommended.

4.  **Deploy the smart contract (if necessary):**
    ```shell
    npx hardhat compile
    npx hardhat ignition deploy ./ignition/modules/Lock.js --network amoy
    ```