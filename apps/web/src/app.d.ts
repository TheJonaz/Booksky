declare global {
  namespace App {
    interface Locals {
      companyId: number;
    }
    interface PageData {
      companyName?: string;
    }
  }
}

export {};
