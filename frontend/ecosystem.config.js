module.exports = {
  apps: [
    {
      name: "erc8004-poc",
      script: "npm",
      args: "run start",
      cwd: "/root/erc8004-poc/frontend",
      env: {
        PORT: 3001,
      },
    },
  ],
};
