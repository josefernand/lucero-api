import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";

export class LuceroApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB table for products
    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
      // WARNING: This will delete your table and its data on stack deletion
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function for CRUD operations on products
    const productsLambda = new lambdaNodejs.NodejsFunction(
      this,
      "ProductsLambda",
      {
        entry: "lambda/products.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
        },
      }
    );

    // Grant DynamoDB permissions to the Lambda function
    productsTable.grantReadWriteData(productsLambda);

    // Create API Gateway
    const api = new apigw.RestApi(this, "ProductsApi", {
      restApiName: "Products API",
      description: "API for managing products",
      apiKeySourceType: apigw.ApiKeySourceType.HEADER,
    });

    // Create API key
    const usagePlan = api.addUsagePlan("ProductsUssagePlan");
    usagePlan.addApiStage({ stage: api.deploymentStage });
    const apiKey = api.addApiKey("ProductsApiKey");
    usagePlan.addApiKey(apiKey);

    // Define API Gateway method options
    const methodOptions: apigw.MethodOptions = {
      apiKeyRequired: true,
    };

    // Define API Gateway resources and methods
    const products = api.root.addResource("products");
    products.addMethod(
      "GET",
      new apigw.LambdaIntegration(productsLambda),
      methodOptions
    );
    products.addMethod(
      "POST",
      new apigw.LambdaIntegration(productsLambda),
      methodOptions
    );

    // Add a resource for individual products with path parameter {id}
    const product = products.addResource("{id}");
    // Add methods for GET, PATCH, and DELETE to the individual product resource
    product.addMethod(
      "GET",
      new apigw.LambdaIntegration(productsLambda),
      methodOptions
    );
    product.addMethod(
      "PATCH",
      new apigw.LambdaIntegration(productsLambda),
      methodOptions
    );
    product.addMethod(
      "DELETE",
      new apigw.LambdaIntegration(productsLambda),
      methodOptions
    );

    // Output the API key value
    new cdk.CfnOutput(this, "ApiKey Output", {
      value: apiKey.keyId,
    });
  }
}
