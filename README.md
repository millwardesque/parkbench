# Parkbench!

A web app for checking in visitors at parks and seeing who else is at nearby parks.

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
