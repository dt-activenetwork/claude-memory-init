Feature: Sample BDD Test
  As a developer
  I want to verify the BDD infrastructure is working
  So that I can write feature tests

  Scenario: Create a temporary project directory
    Given a new empty project directory
    Then the directory "." should exist
    And no error should be raised
