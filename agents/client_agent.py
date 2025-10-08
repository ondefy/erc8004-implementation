"""
Client Agent - Feedback and Reputation Management

This agent demonstrates a Client Agent role in the ERC-8004 ecosystem.
It can authorize feedback from rebalancer agents and manage reputation
interactions through the ERC-8004 registries.
"""

import time
from typing import Dict, Any, List
from .base_agent import ERC8004BaseAgent


class ClientAgent(ERC8004BaseAgent):
    """
    Client Agent that manages feedback and reputation for rebalancing services
    """

    def __init__(self, agent_domain: str, private_key: str):
        """Initialize the Client Agent"""
        super().__init__(agent_domain, private_key)

        # Track feedback authorizations
        self.authorized_servers: List[int] = []
        self.feedback_history: List[Dict[str, Any]] = []

        print(f"💼 Client Agent initialized")
        print(f"   Domain: {self.agent_domain}")
        print(f"   Address: {self.address}")

    def submit_feedback(
        self, server_agent_id: int, score: int, comment: str = ""
    ) -> Dict[str, Any]:
        """
        Submit feedback for a rebalancer agent's service

        Args:
            server_agent_id: ID of the rebalancer agent
            score: Feedback score (0-100)
            comment: Optional feedback comment

        Returns:
            Feedback package with transaction details
        """
        if not self.agent_id:
            raise ValueError("Client agent must be registered first")

        if score < 0 or score > 100:
            raise ValueError("Score must be between 0 and 100")

        print(f"📝 Submitting feedback for rebalancer agent {server_agent_id}")
        print(f"   Score: {score}/100")
        if comment:
            print(f"   Comment: {comment}")

        # Create feedback data
        feedback_data = {
            "client_id": self.agent_id,
            "server_id": server_agent_id,
            "score": score,
            "comment": comment,
            "timestamp": int(time.time()),
            "client_domain": self.agent_domain,
        }

        # Store locally
        self.feedback_history.append(feedback_data)

        # In a full implementation, this would be submitted on-chain
        # For now, we simulate the transaction
        print(f"✅ Feedback submitted successfully")
        
        return feedback_data

    def evaluate_rebalancing_quality(
        self, proof_package: Dict[str, Any]
    ) -> int:
        """
        Evaluate the quality of a rebalancing service

        Args:
            proof_package: The proof package to evaluate

        Returns:
            Quality score (0-100)
        """
        print("🎯 Evaluating rebalancing service quality...")

        score = 50  # Base score

        # Check for required components
        if "proof" in proof_package:
            score += 15
            print("   ✅ ZK proof provided")

        if "public_inputs" in proof_package:
            score += 10
            print("   ✅ Public inputs included")

        if "rebalancing_plan" in proof_package:
            score += 15
            print("   ✅ Rebalancing plan documented")

        # Check rebalancing plan quality
        rebalancing_plan = proof_package.get("rebalancing_plan", {})
        
        if "new_allocations" in rebalancing_plan:
            score += 10
            print("   ✅ Allocation analysis provided")

        # Check if allocations are well-balanced
        allocations = rebalancing_plan.get("new_allocations", [])
        if allocations:
            allocation_pcts = [a["allocation_pct"] for a in allocations]
            # Check for diversity (not too concentrated)
            max_alloc = max(allocation_pcts) if allocation_pcts else 0
            if max_alloc < 50:  # No single asset > 50%
                score += 10
                print("   ✅ Well-diversified portfolio")

        # Cap at 100
        score = min(score, 100)

        print(f"   Quality score: {score}/100")
        return score

    def check_rebalancer_reputation(self, server_agent_id: int) -> Dict[str, Any]:
        """
        Check the reputation score of a rebalancer agent

        Args:
            server_agent_id: ID of the rebalancer to check

        Returns:
            Reputation information
        """
        print(f"🔍 Checking reputation for rebalancer agent {server_agent_id}")

        # Filter feedback for this server
        server_feedback = [
            f for f in self.feedback_history if f["server_id"] == server_agent_id
        ]

        if server_feedback:
            avg_score = sum(f["score"] for f in server_feedback) / len(
                server_feedback
            )
            reputation = {
                "server_id": server_agent_id,
                "feedback_count": len(server_feedback),
                "average_score": avg_score,
                "last_feedback": server_feedback[-1] if server_feedback else None,
            }
        else:
            reputation = {
                "server_id": server_agent_id,
                "feedback_count": 0,
                "average_score": 0,
                "last_feedback": None,
            }

        print(f"   Feedback count: {reputation['feedback_count']}")
        print(f"   Average score: {reputation['average_score']:.1f}/100")

        return reputation

    def request_rebalancing_service(
        self,
        server_agent_id: int,
        old_balances: List[str],
        new_balances: List[str],
        prices: List[str],
    ) -> Dict[str, Any]:
        """
        Request a rebalancing service from a rebalancer agent

        Args:
            server_agent_id: ID of the rebalancer agent
            old_balances: Current token balances
            new_balances: Desired token balances
            prices: Token prices

        Returns:
            Service request details
        """
        print(f"📤 Requesting rebalancing service from agent {server_agent_id}")

        request = {
            "client_id": self.agent_id,
            "server_id": server_agent_id,
            "timestamp": int(time.time()),
            "service_type": "zk-rebalancing",
            "params": {
                "old_balances": old_balances,
                "new_balances": new_balances,
                "prices": prices,
            },
            "status": "pending",
        }

        print(f"✅ Service request created")
        return request

    def get_feedback_history(self) -> List[Dict[str, Any]]:
        """Get the complete feedback history from this client"""
        return self.feedback_history

    def get_trust_models(self) -> list:
        """Return supported trust models for this agent"""
        return ["feedback", "reputation-based"]

    def get_agent_card(self) -> Dict[str, Any]:
        """Generate AgentCard following A2A specification"""
        return {
            "agentId": self.agent_id,
            "name": "Rebalancing Client Agent",
            "description": "Client agent for portfolio rebalancing service consumption and feedback provision",
            "version": "1.0.0",
            "skills": [
                {
                    "skillId": "feedback-provision",
                    "name": "Feedback Provision",
                    "description": "Provide feedback and ratings for rebalancing services",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "server_id": {
                                "type": "integer",
                                "description": "Rebalancer agent ID",
                            },
                            "score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                            },
                            "comment": {"type": "string"},
                        },
                        "required": ["server_id", "score"],
                    },
                    "outputSchema": {
                        "type": "object",
                        "properties": {
                            "success": {"type": "boolean"},
                            "feedback_id": {"type": "string"},
                        },
                    },
                },
                {
                    "skillId": "quality-evaluation",
                    "name": "Service Quality Evaluation",
                    "description": "Evaluate the quality of rebalancing services and proofs",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "proof_package": {"type": "object"}
                        },
                        "required": ["proof_package"],
                    },
                    "outputSchema": {
                        "type": "object",
                        "properties": {
                            "quality_score": {"type": "integer"},
                        },
                    },
                },
            ],
            "trustModels": self.get_trust_models(),
            "registrations": [
                {
                    "agentId": self.agent_id,
                    "agentAddress": f"eip155:{self.w3.eth.chain_id}:{self.address}",
                    "signature": "0x...",
                }
            ],
        }


