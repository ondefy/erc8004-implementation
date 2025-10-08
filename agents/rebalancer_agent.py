"""
Rebalancer Agent - ZK Portfolio Rebalancing Service

This agent demonstrates a Server Agent role in the ERC-8004 ecosystem.
It generates zero-knowledge proofs for portfolio rebalancing and submits
them for validation through the ERC-8004 registries.
"""

import hashlib
import json
import os
import subprocess
from typing import Dict, Any, List
from .base_agent import ERC8004BaseAgent


class RebalancerAgent(ERC8004BaseAgent):
    """
    Server Agent that provides ZK-proof based rebalancing validation services
    """

    def __init__(self, agent_domain: str, private_key: str):
        """Initialize the Rebalancer Agent"""
        super().__init__(agent_domain, private_key)

        print(f"💼 Rebalancer Agent initialized")
        print(f"   Domain: {self.agent_domain}")
        print(f"   Address: {self.address}")

    def create_rebalancing_plan(
        self,
        old_balances: List[str],
        new_balances: List[str],
        prices: List[str],
        min_allocation_pct: str = "10",
        max_allocation_pct: str = "40",
    ) -> Dict[str, Any]:
        """
        Create a portfolio rebalancing plan

        Args:
            old_balances: Current token balances [token0, token1, token2, token3]
            new_balances: Proposed token balances after rebalancing
            prices: Current prices for each token
            min_allocation_pct: Minimum allocation percentage per asset
            max_allocation_pct: Maximum allocation percentage per asset

        Returns:
            Rebalancing plan with metadata
        """
        print(f"📊 Creating rebalancing plan...")

        # Calculate total values
        old_total = sum(int(bal) * int(price) for bal, price in zip(old_balances, prices))
        new_total = sum(int(bal) * int(price) for bal, price in zip(new_balances, prices))

        print(f"   Old portfolio value: {old_total:,}")
        print(f"   New portfolio value: {new_total:,}")

        # Check if value is preserved
        if old_total != new_total:
            raise ValueError(
                f"Portfolio value not preserved! Old: {old_total}, New: {new_total}"
            )

        # Calculate allocations
        new_allocations = []
        for i, (bal, price) in enumerate(zip(new_balances, prices)):
            value = int(bal) * int(price)
            allocation_pct = (value / new_total) * 100 if new_total > 0 else 0
            new_allocations.append({
                "token_index": i,
                "balance": bal,
                "value": value,
                "allocation_pct": round(allocation_pct, 2),
            })
            print(f"   Token {i}: {allocation_pct:.2f}% allocation")

        # Check allocation bounds
        min_pct = int(min_allocation_pct)
        max_pct = int(max_allocation_pct)
        
        for alloc in new_allocations:
            if alloc["allocation_pct"] < min_pct:
                print(f"   ⚠️  Token {alloc['token_index']} below minimum: {alloc['allocation_pct']:.2f}% < {min_pct}%")
            if alloc["allocation_pct"] > max_pct:
                print(f"   ⚠️  Token {alloc['token_index']} above maximum: {alloc['allocation_pct']:.2f}% > {max_pct}%")

        rebalancing_plan = {
            "old_balances": old_balances,
            "new_balances": new_balances,
            "prices": prices,
            "old_total_value": old_total,
            "new_total_value": new_total,
            "new_allocations": new_allocations,
            "min_allocation_pct": min_allocation_pct,
            "max_allocation_pct": max_allocation_pct,
            "timestamp": self.w3.eth.get_block("latest")["timestamp"],
            "agent_id": self.agent_id,
            "agent_domain": self.agent_domain,
        }

        print(f"✅ Rebalancing plan created")
        return rebalancing_plan

    def generate_zk_proof(self, rebalancing_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a zero-knowledge proof for the rebalancing plan

        Args:
            rebalancing_plan: The rebalancing plan to prove

        Returns:
            Proof package with proof, public inputs, and metadata
        """
        print(f"🔐 Generating zero-knowledge proof...")

        # Prepare input for circuit
        circuit_input = {
            "oldBalances": rebalancing_plan["old_balances"],
            "newBalances": rebalancing_plan["new_balances"],
            "prices": rebalancing_plan["prices"],
            "totalValueCommitment": str(rebalancing_plan["new_total_value"]),
            "minAllocationPct": rebalancing_plan["min_allocation_pct"],
            "maxAllocationPct": rebalancing_plan["max_allocation_pct"],
        }

        # Create temporary input file
        temp_input_path = "build/temp_input.json"
        with open(temp_input_path, "w") as f:
            json.dump(circuit_input, f, indent=2)

        try:
            # Generate witness
            print("   1️⃣  Calculating witness...")
            witness_result = subprocess.run(
                [
                    "snarkjs", "wtns", "calculate",
                    "build/rebalancing.wasm",
                    temp_input_path,
                    "build/witness.wtns"
                ],
                capture_output=True,
                text=True,
                check=True
            )

            # Verify witness
            print("   2️⃣  Verifying witness...")
            verify_result = subprocess.run(
                [
                    "snarkjs", "wtns", "check",
                    "build/rebalancing.r1cs",
                    "build/witness.wtns"
                ],
                capture_output=True,
                text=True,
                check=True
            )

            # Generate proof
            print("   3️⃣  Generating proof...")
            proof_result = subprocess.run(
                [
                    "snarkjs", "groth16", "prove",
                    "build/rebalancing_final.zkey",
                    "build/witness.wtns",
                    "build/proof.json",
                    "build/public.json"
                ],
                capture_output=True,
                text=True,
                check=True
            )

            # Load generated proof and public inputs
            with open("build/proof.json", "r") as f:
                proof = json.load(f)

            with open("build/public.json", "r") as f:
                public_inputs = json.load(f)

            print(f"✅ Zero-knowledge proof generated successfully")

            proof_package = {
                "proof": proof,
                "public_inputs": public_inputs,
                "rebalancing_plan": rebalancing_plan,
                "circuit_input": circuit_input,
                "metadata": {
                    "proof_system": "groth16",
                    "curve": "bn128",
                    "circuit": "rebalancing",
                    "agent_id": self.agent_id,
                    "timestamp": rebalancing_plan["timestamp"],
                },
            }

            return proof_package

        except subprocess.CalledProcessError as e:
            print(f"❌ ZK proof generation failed:")
            print(f"   Command: {' '.join(e.cmd)}")
            print(f"   Error: {e.stderr}")
            raise Exception(f"ZK proof generation failed: {e.stderr}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)

    def submit_proof_for_validation(
        self, proof_package: Dict[str, Any], validator_agent_id: int
    ) -> str:
        """
        Submit ZK proof for validation through ERC-8004

        Args:
            proof_package: The completed proof package
            validator_agent_id: ID of the validator agent

        Returns:
            Transaction hash of the validation request
        """
        # Create a hash of the proof package
        proof_json = json.dumps(proof_package, sort_keys=True)
        data_hash = hashlib.sha256(proof_json.encode()).digest()

        print(f"📤 Submitting proof for validation")
        print(f"   Data hash: {data_hash.hex()}")
        print(f"   Validator: Agent {validator_agent_id}")

        # Store the proof package for the validator to retrieve
        self._store_proof_package(data_hash.hex(), proof_package)

        # Request validation through ERC-8004
        tx_hash = self.request_validation(validator_agent_id, data_hash)

        return tx_hash

    def _store_proof_package(self, data_hash: str, proof_package: Dict[str, Any]):
        """Store proof package for validator retrieval"""
        os.makedirs("data", exist_ok=True)

        with open(f"data/{data_hash}.json", "w") as f:
            json.dump(proof_package, f, indent=2)

        print(f"💾 Proof package stored: data/{data_hash}.json")

    def authorize_client_feedback(self, client_agent_id: int) -> str:
        """
        Authorize a client agent to provide feedback

        Args:
            client_agent_id: ID of the client agent to authorize

        Returns:
            Transaction hash
        """
        if not self.agent_id:
            raise ValueError("Rebalancer agent must be registered first")

        print(f"🔐 Authorizing client {client_agent_id} to provide feedback")

        function = self.reputation_registry.functions.acceptFeedback(
            client_agent_id,
            self.agent_id,
        )

        transaction = function.build_transaction(
            {
                "from": self.address,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
                "nonce": self.w3.eth.get_transaction_count(self.address),
            }
        )

        try:
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction, private_key=self.private_key
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

            print(f"   Transaction hash: {tx_hash.hex()}")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ Client feedback authorization successful")
                return tx_hash.hex()
            else:
                raise Exception("Client feedback authorization transaction failed")
        except Exception as e:
            print(f"❌ Client feedback authorization error: {str(e)}")
            raise Exception(f"Client feedback authorization failed: {str(e)}")

    def get_trust_models(self) -> list:
        """Return supported trust models for this agent"""
        return ["inference-validation", "zero-knowledge"]

    def get_agent_card(self) -> Dict[str, Any]:
        """Generate AgentCard following A2A specification"""
        return {
            "agentId": self.agent_id,
            "name": "ZK Rebalancer Agent",
            "description": "Provides zero-knowledge proof based portfolio rebalancing validation",
            "version": "1.0.0",
            "skills": [
                {
                    "skillId": "zk-rebalancing",
                    "name": "ZK Portfolio Rebalancing",
                    "description": "Generate zero-knowledge proofs for portfolio rebalancing that prove compliance with allocation constraints without revealing positions",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "old_balances": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Current token balances",
                            },
                            "new_balances": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Proposed token balances",
                            },
                            "prices": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Token prices",
                            },
                            "min_allocation_pct": {
                                "type": "string",
                                "description": "Minimum allocation percentage",
                            },
                            "max_allocation_pct": {
                                "type": "string",
                                "description": "Maximum allocation percentage",
                            },
                        },
                        "required": ["old_balances", "new_balances", "prices"],
                    },
                    "outputSchema": {
                        "type": "object",
                        "properties": {
                            "proof": {"type": "object"},
                            "public_inputs": {"type": "array"},
                            "data_hash": {"type": "string"},
                        },
                    },
                }
            ],
            "trustModels": self.get_trust_models(),
            "registrations": [
                {
                    "agentId": self.agent_id,
                    "agentAddress": f"eip155:{self.w3.eth.chain_id}:{self.address}",
                    "signature": "0x...",  # Would be actual signature in production
                }
            ],
        }


