const { defineConfig } = require("vitest/config");
const path = require("path");

module.exports = defineConfig({
    test: {
        globals: true,
        environment: "node",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
