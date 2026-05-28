{ pkgs, lib, ... }:

{
  packages = with pkgs; [
    git
    nodejs_22
    nodePackages.pnpm
    foundry
    python312
    uv
    cargo
    rustc
    pkg-config
    openssl
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    corepack.enable = true;
  };

  languages.python = {
    enable = true;
    package = pkgs.python312;
    uv.enable = true;
  };

  languages.rust = {
    enable = true;
    channel = "stable";
  };
}
