\# SFIC Backend



Backend API for Surakshit Gujarat, a Gujarati-focused cyber-fraud assistance platform. It provides APIs for suspicious message analysis, URL analysis, and complaint draft management.



\## Technology Stack

\- Node.js

\- Express.js

\- Neon PostgreSQL

\- REST API



\## Project Structure



backend/

├── config/

│   └── db.js

├── controllers/

│   ├── complaintController.js

│   ├── guidanceController.js

│   └── scanController.js

├── data/

│   └── guidanceKnowledgeBase.json

├── database/

│   └── schema.sql

├── routes/

│   ├── guidanceRoutes.js

│   └── scanRoutes.js

├── scripts/

│   └── evaluateDataset.js

├── services/

│   ├── guidanceService.js

│   ├── messageAnalysisService.js

│   └── urlAnalysisService.js

├── tests/

├── server.js

└── package.json



\## Requirements

\- Node.js (LTS recommended)

\- npm

\- Neon PostgreSQL database



\## Installation and Setup



\### 1. Clone the Repository

git clone <repository-url>



\### 2. Navigate to the Backend Folder

cd SFIC/backend



\### 3. Install Dependencies

npm install



\### 4. Configure Environment Variables



Create a .env file inside the backend folder and add:



PORT=5000

DATABASE\_URL=your\_neon\_postgresql\_connection\_string



Replace the database URL with your actual Neon PostgreSQL connection string.



Never commit or share your .env file or database credentials.



\### 5. Configure the Database



1\. Open your Neon SQL Editor.

2\. Copy the SQL commands from database/schema.sql.

3\. Execute the SQL commands to create the required database tables.



\### 6. Start the Backend

npm run dev



The backend runs at:

http://localhost:5000



\## API Endpoints



| Method | Endpoint | Description |

|---|---|---|

| POST | /api/scans/message | Analyzes suspicious text messages |

| POST | /api/scans/url | Analyzes potentially suspicious URLs |

| POST | /api/guidance/complaint | Generates and saves complaint drafts |



\## Database



The backend uses Neon PostgreSQL.



\### Database Tables



\- scan\_history – Stores message and URL scan results.

\- complaint\_drafts – Stores generated complaint drafts and related scan references.



The database schema is available in database/schema.sql.



\## Testing



Run the backend tests using:



npm test



This command requires a test script to be configured in package.json.



\## Important Notes



\- Message and URL analysis currently use rule-based checks.

\- Risk scores are indicative and should not be treated as definitive fraud detection.

\- Complaint drafts are generated using application-defined templates and logic.

\- Users should verify suspicious incidents through official cybercrime reporting channels.

\- The platform does not guarantee fraud prevention or recovery of lost money.

