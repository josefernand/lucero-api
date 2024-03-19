import * as AWS from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Product } from "@/ts";

// Create an instance of the DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const path = event.path;
    switch (event.httpMethod) {
      case "GET":
        if (path === "/products") {
          // List all products
          const products = await listProducts();
          return {
            statusCode: 200,
            body: JSON.stringify(products),
          };
        } else if (path.startsWith("/products/")) {
          // Get a product by ID
          const productId = path.substring("/products/".length);
          const product = await getProductById(productId);
          if (!product) {
            return {
              statusCode: 404,
              body: JSON.stringify({ message: "Product not found" }),
            };
          }
          return {
            statusCode: 200,
            body: JSON.stringify(product),
          };
        } else {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not found" }),
          };
        }
      case "POST":
        // Create a new product
        const newProductData: Partial<Product> = JSON.parse(event.body || "{}");
        const newProduct = await createProduct(newProductData);
        if (!newProduct) {
          return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to create product" }),
          };
        }
        return {
          statusCode: 201,
          body: JSON.stringify(newProduct),
        };
      case "PATCH":
        // Update a product by ID
        const updateProductData: Partial<Product> = JSON.parse(
          event.body || "{}"
        );
        const productIdToUpdate = event.pathParameters?.id;
        if (!productIdToUpdate) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Product ID is required" }),
          };
        }
        const updatedProduct = await updateProduct(
          productIdToUpdate,
          updateProductData
        );
        if (!updatedProduct) {
          return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to update product" }),
          };
        }
        return {
          statusCode: 200,
          body: JSON.stringify(updatedProduct),
        };
      case "DELETE":
        // Delete a product by ID
        const productIdToDelete = event.pathParameters?.id;
        if (!productIdToDelete) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Product ID is required" }),
          };
        }
        await deleteProduct(productIdToDelete);
        return {
          statusCode: 204,
          body: JSON.stringify({}),
        };
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
}

// Function to get a product by ID from DynamoDB
async function getProductById(productId: string): Promise<Product | null> {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || "",
    Key: {
      sku: productId,
    },
  };
  try {
    const data = await dynamodb.get(params).promise();
    return data.Item as Product;
  } catch (error) {
    console.error("Error getting product from DynamoDB:", error);
    return null;
  }
}

// Function to list all products from DynamoDB
async function listProducts(): Promise<Product[]> {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || "",
  };
  try {
    const data = await dynamodb.scan(params).promise();
    return data.Items as Product[];
  } catch (error) {
    console.error("Error listing products from DynamoDB:", error);
    return [];
  }
}

// Function to create a new product in DynamoDB
async function createProduct(
  productData: Partial<Product>
): Promise<Product | null> {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || "",
    Item: productData,
  };
  try {
    await dynamodb.put(params).promise();
    return productData as Product;
  } catch (error) {
    console.error("Error creating product in DynamoDB:", error);
    return null;
  }
}

// Function to update a product in DynamoDB
async function updateProduct(
  productId: string,
  updateData: Partial<Product>
): Promise<Product | null> {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || "",
    Key: {
      sku: productId,
    },
    UpdateExpression:
      "SET #name = :name, description = :description, images = :images, price = :price, quantity = :quantity, providerName = :providerName, providerSku = :providerSku, providerUrl = :providerUrl, available = :available",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": updateData.name,
      ":description": updateData.description,
      ":images": updateData.images,
      ":price": updateData.price,
      ":quantity": updateData.quantity,
      ":providerName": updateData.providerName,
      ":providerSku": updateData.providerSku,
      ":providerUrl": updateData.providerUrl,
      ":available": updateData.available,
    },
    ReturnValues: "ALL_NEW",
  };
  try {
    const data = await dynamodb.update(params).promise();
    return data.Attributes as Product;
  } catch (error) {
    console.error("Error updating product in DynamoDB:", error);
    return null;
  }
}

// Function to delete a product from DynamoDB
async function deleteProduct(productId: string): Promise<void> {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || "",
    Key: {
      sku: productId,
    },
  };
  try {
    await dynamodb.delete(params).promise();
  } catch (error) {
    console.error("Error deleting product from DynamoDB:", error);
  }
}
