"""
Validator Agent - ZK Proof Validation Service

This agent demonstrates a Validator Agent role in the ERC-8004 ecosystem.
It validates zero-knowledge proofs submitted by Rebalancer Agents and
provides validation scores through the ERC-8004 registries.
"""

import json
import os
import subprocess
from typing import Dict, Any, Optional, Union
from .base_agent import ERC8004BaseAgent


class ValidatorAgent(ERC8004BaseAgent):
    """
    Validator Agent that validates ZK proofs for portfolio rebalancing
    """

    def __init__(self, agent_domain: str, private_key: str):
        """Initialize the Validator Agent"""
        super().__init__(agent_domain, private_key)

        print(f"🔍 Validator Agent initialized")
        print(f"   Domain: {self.agent_domain}")
        print(f"   Address: {self.address}")

    def validate_proof(self, data_hash: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate a ZK proof for portfolio rebalancing

        Args:
            data_hash: Either a hash of the proof package or the proof package itself

        Returns:
            Validation results with score
        """
        # Handle both hash string and actual proof data
        if isinstance(data_hash, dict):
            proof_package = data_hash
            import hashlib
            data_str = json.dumps(proof_package, sort_keys=True)
            computed_hash = hashlib.sha256(data_str.encode()).hexdigest()
            print(f"🔍 Starting validation for proof data (hash: {computed_hash[:8]}...)")
            final_hash = computed_hash
        else:
            print(f"🔍 Starting validation for data hash: {data_hash}")
            proof_package = self._load_proof_package(data_hash)
            final_hash = data_hash
            if not proof_package:
                return {
                    "error": "Proof package not found",
                    "score": 0,
                    "validation_complete": False,
                }

        # Extract proof components
        proof = proof_package.get("proof")
        public_inputs = proof_package.get("public_inputs")

        if not proof or not public_inputs:
            return {
                "error": "Invalid proof package format",
                "score": 0,
                "validation_complete": False,
            }

        print("   📋 Validating proof components...")
        
        # Step 1: Verify proof structure
        structure_score = self._verify_proof_structure(proof, public_inputs)
        print(f"   Structure verification: {structure_score}/100")

        # Step 2: Verify proof cryptographically
        crypto_score = self._verify_proof_cryptography(proof, public_inputs)
        print(f"   Cryptographic verification: {crypto_score}/100")

        # Step 3: Verify rebalancing logic
        logic_score = self._verify_rebalancing_logic(proof_package)
        print(f"   Rebalancing logic: {logic_score}/100")

        # Calculate overall score
        overall_score = int(
            (structure_score * 0.2) + (crypto_score * 0.5) + (logic_score * 0.3)
        )

        validation_report = {
            "structure_score": structure_score,
            "cryptographic_score": crypto_score,
            "logic_score": logic_score,
            "overall_score": overall_score,
            "proof_valid": crypto_score == 100,
            "meets_constraints": logic_score >= 80,
        }

        print(f"✅ Validation completed with overall score: {overall_score}/100")

        return {
            "is_valid": overall_score >= 70,
            "score": overall_score,
            "validation_package": {
                "data_hash": final_hash,
                "validator_agent_id": self.agent_id,
                "validator_domain": self.agent_domain,
                "timestamp": self.w3.eth.get_block("latest")["timestamp"],
                "validation_score": overall_score,
                "validation_report": validation_report,
                "original_proof": proof_package,
            },
            "report": json.dumps(validation_report, indent=2),
        }

    def _verify_proof_structure(
        self, proof: Dict[str, Any], public_inputs: list
    ) -> int:
        """Verify the proof has correct structure"""
        try:
            # Check proof components exist
            required_keys = ["pi_a", "pi_b", "pi_c", "protocol", "curve"]
            if not all(key in proof for key in required_keys):
                return 0

            # Check protocol and curve
            if proof["protocol"] != "groth16" or proof["curve"] != "bn128":
                return 50

            # Check public inputs is a list
            if not isinstance(public_inputs, list):
                return 50

            # Check proof point structure
            if not (
                isinstance(proof["pi_a"], list)
                and len(proof["pi_a"]) == 3
                and isinstance(proof["pi_b"], list)
                and len(proof["pi_b"]) == 3
                and isinstance(proof["pi_c"], list)
                and len(proof["pi_c"]) == 3
            ):
                return 60

            return 100

        except Exception as e:
            print(f"   ⚠️  Structure verification error: {e}")
            return 0

    def _verify_proof_cryptography(
        self, proof: Dict[str, Any], public_inputs: list
    ) -> int:
        """Verify the proof cryptographically using snarkjs"""
        try:
            # Save proof and public inputs to temporary files
            temp_proof_path = "build/temp_proof.json"
            temp_public_path = "build/temp_public.json"

            with open(temp_proof_path, "w") as f:
                json.dump(proof, f)

            with open(temp_public_path, "w") as f:
                json.dump(public_inputs, f)

            # Run snarkjs verify
            print("   🔐 Running cryptographic verification...")
            result = subprocess.run(
                [
                    "snarkjs",
                    "groth16",
                    "verify",
                    "build/verification_key.json",
                    temp_public_path,
                    temp_proof_path,
                ],
                capture_output=True,
                text=True,
            )

            # Clean up temp files
            if os.path.exists(temp_proof_path):
                os.remove(temp_proof_path)
            if os.path.exists(temp_public_path):
                os.remove(temp_public_path)

            # Check result
            if result.returncode == 0 and "OK" in result.stdout:
                print("   ✅ Proof is cryptographically valid")
                return 100
            else:
                print(f"   ❌ Proof verification failed: {result.stdout}")
                return 0

        except Exception as e:
            print(f"   ⚠️  Cryptographic verification error: {e}")
            return 50

    def _verify_rebalancing_logic(self, proof_package: Dict[str, Any]) -> int:
        """Verify the rebalancing plan logic"""
        try:
            rebalancing_plan = proof_package.get("rebalancing_plan", {})

            old_balances = rebalancing_plan.get("old_balances", [])
            new_balances = rebalancing_plan.get("new_balances", [])
            prices = rebalancing_plan.get("prices", [])
            min_pct = int(rebalancing_plan.get("min_allocation_pct", "0"))
            max_pct = int(rebalancing_plan.get("max_allocation_pct", "100"))

            if not (old_balances and new_balances and prices):
                return 0

            # Check value preservation
            old_total = sum(
                int(bal) * int(price) for bal, price in zip(old_balances, prices)
            )
            new_total = sum(
                int(bal) * int(price) for bal, price in zip(new_balances, prices)
            )

            if old_total != new_total:
                print(f"   ❌ Value not preserved: {old_total} != {new_total}")
                return 30

            # Check allocation bounds
            allocations_valid = True
            for i, (bal, price) in enumerate(zip(new_balances, prices)):
                value = int(bal) * int(price)
                allocation_pct = (value / new_total) * 100 if new_total > 0 else 0

                if allocation_pct < min_pct or allocation_pct > max_pct:
                    print(
                        f"   ⚠️  Token {i} allocation {allocation_pct:.2f}% outside bounds [{min_pct}%, {max_pct}%]"
                    )
                    allocations_valid = False

            if not allocations_valid:
                return 70  # Partial credit for value preservation

            print("   ✅ Rebalancing logic is sound")
            return 100

        except Exception as e:
            print(f"   ⚠️  Logic verification error: {e}")
            return 50

    def submit_validation_response(
        self, validation_package: Dict[str, Any]
    ) -> str:
        """
        Submit validation response through ERC-8004

        Args:
            validation_package: The completed validation

        Returns:
            Transaction hash of the validation response
        """
        data_hash = bytes.fromhex(validation_package["data_hash"])
        score = validation_package["validation_score"]

        print(f"📤 Submitting validation response")
        print(f"   Data hash: {validation_package['data_hash']}")
        print(f"   Score: {score}/100")

        # Store the validation package for reference
        self._store_validation_package(
            validation_package["data_hash"], validation_package
        )

        # Submit validation response through ERC-8004
        tx_hash = super().submit_validation_response(data_hash, score)

        return tx_hash

    def _load_proof_package(self, data_hash: str) -> Optional[Dict[str, Any]]:
        """Load proof package for validation"""
        try:
            with open(f"data/{data_hash}.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Proof package not found: data/{data_hash}.json")
            return None

    def _store_validation_package(
        self, data_hash: str, validation_package: Dict[str, Any]
    ):
        """Store validation package for reference"""
        os.makedirs("validations", exist_ok=True)

        with open(f"validations/{data_hash}.json", "w") as f:
            json.dump(validation_package, f, indent=2)

        print(f"💾 Validation package stored: validations/{data_hash}.json")

    def get_trust_models(self) -> list:
        """Return supported trust models for this agent"""
        return ["inference-validation", "zero-knowledge", "crypto-economic"]

    def get_agent_card(self) -> Dict[str, Any]:
        """Generate AgentCard following A2A specification"""
        return {
            "agentId": self.agent_id,
            "name": "ZK Proof Validator Agent",
            "description": "Validates zero-knowledge proofs for portfolio rebalancing",
            "version": "1.0.0",
            "skills": [
                {
                    "skillId": "zk-proof-validation",
                    "name": "ZK Proof Validation",
                    "description": "Comprehensive validation of Groth16 ZK proofs with cryptographic and logical verification",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "data_hash": {
                                "type": "string",
                                "description": "Hash of proof to validate",
                            }
                        },
                        "required": ["data_hash"],
                    },
                    "outputSchema": {
                        "type": "object",
                        "properties": {
                            "validation_score": {"type": "number"},
                            "validation_report": {"type": "object"},
                            "proof_valid": {"type": "boolean"},
                        },
                    },
                }
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


