# Parkbench!

A mobile-first web app for parents to check-in their kids at nearby parks, and to see which other kids are at nearby parks

User stories:

1. As a parent, I want to use my mobile device to check-in one or more of my kids at a nearby park for a given duration of time.
2. As a parent, I want to use my mobile device to see which other kids are at nearby parks and how long they've been there / will be there so that I can decide which one to visit

Pages:

1. Home:
   - A check-in form that allows me to choose a park, a duration, and one or more of my kids to check in
   - A list of nearby parks, each with a list of checked-in kids, their check-in times, and their estimated checkout time.
   - A mass check-out button that allows me to check out all checked-in kids
2. Visitors
   - A list of my kids, with an inline form to edit their name or delete them
   - An inline form to add a new visitor containing a field for their name
3. Sign-in
   - A form to sign in with email
4. Registration
   - A form to register with email and name, and a field for the user to enter each of their kids' names

It should be noted that the code quality here is abysmal, this project is an experiment in complete vibe-coding to understand what works, what doesn't, and what's possible.

## Development

Run the dev server:

```sh
npm run dev
```

### Environment Variables

This project uses `dotenv-safe` to manage environment variables. This ensures that all required variables are present before the application starts.

1.  **Create a `.env` file**: Copy the example file `.env.example` to a new file named `.env` in the project root.

    ```sh
    cp .env.example .env
    ```

2.  **Fill in the values**: Edit the `.env` file to include the necessary values for your local environment (e.g., your `DATABASE_URL`).

The `.env` file is included in `.gitignore` and should never be committed to version control.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
