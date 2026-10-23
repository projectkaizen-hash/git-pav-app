import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Pav Dental Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, Pav Dental.`,
  meta: {
    title: "Pav Dental Admin",
    description: "Staff back office for the Pav Dental website and app.",
  },
};
