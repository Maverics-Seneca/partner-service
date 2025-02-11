# Partner Service

## Overview

The Partner Service is a crucial component of our microservices architecture, designed to manage caregiver access through partner code generation and verification. This service is built with Node.js and utilizes Firebase Firestore for data storage and management.

## Features

- Partner code generation
- Partner code verification
- Caregiver access management

## Tech Stack

- Node.js
- Express.js
- Firebase Firestore

## Project Structure

```
partner-service/
│── src/
│ ├── controllers/
│ │ ├── partnerController.js
│ ├── routes/
│ │ ├── partnerRoutes.js
│ ├── models/
│ │ ├── Partner.js
│ ├── config/
│ │ ├── firebase.js
│ ├── app.js
│── .github/workflows/
│── Dockerfile
│── package.json
│── README.md
```

## Setup and Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/maverics-seneca/partner-service.git
   ```

2. Install dependencies:

   ```sh
   cd partner-service
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:

   ```sh
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   ```

4. Start the service:

   ```sh
   npm start
   ```

## API Endpoints

- `POST /partner/generate` - Generate a new partner code
- `POST /partner/verify` - Verify a partner code
- `GET /partner/:id` - Get partner information
- `PUT /partner/:id` - Update partner information

## Docker

To build and run the service using Docker:

```sh
docker build -t partner-service .
docker run -p 3000:3000 partner-service
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/ci-cd.yml`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
