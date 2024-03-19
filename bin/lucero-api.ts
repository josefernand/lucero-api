#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { LuceroApiStack } from "../lib/lucero-api-stack";

const app = new cdk.App();
new LuceroApiStack(app, "LuceroApiStack", {});
