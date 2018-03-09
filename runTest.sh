#!/usr/bin/env bash

function run_tests {
  echo "**********************************************"
  echo "Begin Running Tests "
  echo "**********************************************"

  mocha --timeout 10000 validation/*.spec.js

  echo "**********************************************"
  echo "End Running Tests "
  echo "**********************************************"
}

run_tests
