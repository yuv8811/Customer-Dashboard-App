import { Page, Layout, Card, Text, Button, Box, BlockStack, List, Badge, Divider } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useSubmit, useLoaderData, redirect } from "react-router";


export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
        query {
            app {
                installation {
                    activeSubscriptions {
                        name
                        test
                    }
                }
            }
        }`
    );

    const data = await response.json();
    const activeSubscriptions = data.data.app.installation.activeSubscriptions;
    // Default to "Basic" if no active subscription
    const currentPlan = activeSubscriptions.length > 0 ? activeSubscriptions[0].name : "Basic";

    return { currentPlan };
};

export const action = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const plan = formData.get("plan");
    const price = formData.get("price");

    const response = await admin.graphql(
        `#graphql
        mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
            appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test) {
                userErrors {
                    field
                    message
                }
                appSubscription {
                    id
                }
                confirmationUrl
            }
        }`,
        {
            variables: {
                name: plan,
                returnUrl: `https://${new URL(request.url).host}/app`,
                lineItems: [
                    {
                        plan: {
                            appRecurringPricingDetails: {
                                price: { amount: price, currencyCode: "USD" },
                                interval: "EVERY_30_DAYS",
                            },
                        },
                    },
                ],
                test: true,
            },
        }
    );

    const responseJson = await response.json();
    const { userErrors, confirmationUrl } = responseJson.data.appSubscriptionCreate;

    if (userErrors.length > 0) {
        console.error("Subscription errors:", userErrors);
        return { errors: userErrors };
    }

    if (!confirmationUrl) {
        console.error("No confirmation URL returned");
        return { error: "Failed to create subscription" };
    }

    return redirect(confirmationUrl);
};
export default function Pricing() {
    const { currentPlan } = useLoaderData();
    const submit = useSubmit();

    const handleUpgrade = (plan, price) => {
        submit({ plan, price }, { method: "POST" });
    };

    return (
        <Page
            title="Pricing Plans"
            subtitle="Choose the perfect plan for your business needs."
        >
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text variant="headingRg" as="h3">Basic</Text>
                                    <Text variant="heading3xl" as="h2">Free</Text>
                                    <Text variant="bodyMd" as="p" tone="subdued">
                                        Essential tools for new businesses.
                                    </Text>
                                </BlockStack>

                                <Divider />

                                <BlockStack gap="300">
                                    <Text variant="headingSm" as="h4">Features</Text>
                                    <List type="bullet">
                                        <List.Item>Basic Customer Profile</List.Item>
                                        <List.Item>Last 30 days history</List.Item>
                                        <List.Item>Standard Support</List.Item>
                                    </List>
                                </BlockStack>

                                <Button fullWidth disabled={currentPlan === "Basic"}>
                                    {currentPlan === "Basic" ? "Current Plan" : "Downgrade to Basic"}
                                </Button>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '10px', zIndex: 1 }}>
                            <Badge tone="success">Most Popular</Badge>
                        </div>
                        <Card>
                            <Box padding="400">
                                <BlockStack gap="400">
                                    <BlockStack gap="200">
                                        <Text variant="headingRg" as="h3">Grow</Text>
                                        <Text variant="heading3xl" as="h2">$19/mo</Text>
                                        <Text variant="bodyMd" as="p" tone="subdued">
                                            Advanced insights for growing stores.
                                        </Text>
                                    </BlockStack>

                                    <Divider />

                                    <BlockStack gap="300">
                                        <Text variant="headingSm" as="h4">Everything in Basic, plus:</Text>
                                        <List type="bullet">
                                            <List.Item>Full Customer Timeline</List.Item>
                                            <List.Item>Segment Analytics</List.Item>
                                            <List.Item>Email Integration</List.Item>
                                            <List.Item>Priority Support</List.Item>
                                        </List>
                                    </BlockStack>

                                    <Button
                                        fullWidth
                                        variant="primary"
                                        onClick={() => handleUpgrade("Grow", "19")}
                                        disabled={currentPlan === "Grow"}
                                    >
                                        {currentPlan === "Grow" ? "Current Plan" : "Upgrade to Grow"}
                                    </Button>
                                </BlockStack>
                            </Box>
                        </Card>
                    </div>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <BlockStack gap="200">
                                    <Text variant="headingRg" as="h3">Advance</Text>
                                    <Text variant="heading3xl" as="h2">$49/mo</Text>
                                    <Text variant="bodyMd" as="p" tone="subdued">
                                        Maximum power for scaling brands.
                                    </Text>
                                </BlockStack>

                                <Divider />

                                <BlockStack gap="300">
                                    <Text variant="headingSm" as="h4">Everything in Grow, plus:</Text>
                                    <List type="bullet">
                                        <List.Item>Custom Reports</List.Item>
                                        <List.Item>API Access</List.Item>
                                        <List.Item>Dedicated Account Manager</List.Item>
                                        <List.Item>Unlimited History</List.Item>
                                    </List>
                                </BlockStack>

                                <Button
                                    fullWidth
                                    onClick={() => handleUpgrade("Advance", "49")}
                                    disabled={currentPlan === "Advance"}
                                >
                                    {currentPlan === "Advance" ? "Current Plan" : "Upgrade to Advance"}
                                </Button>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}