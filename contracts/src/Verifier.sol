// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 19017398443261389666833467149165803632576932204211414454433986490811185608595;
    uint256 constant alphay  = 21191490213085583793104153888521737781922329322517168283556419965017510305066;
    uint256 constant betax1  = 3438733882258868421997293416919620985743455806121219573339264285718352708094;
    uint256 constant betax2  = 2090070955789377061879636734629598044434787150637691131843604466045023551225;
    uint256 constant betay1  = 19821875361946347712745145435368709842237221729269159334990373229208259946192;
    uint256 constant betay2  = 18524119822732562936355210788538813487927164911607042587130748841853809815824;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 4297144463546037777710542965123387427039423279065918487735345806247568179327;
    uint256 constant deltax2 = 14791630803279718704828211380662084957126410327439173576768186888850227206825;
    uint256 constant deltay1 = 19249574520406126084399425681409639649347959496849345123436540494415250012189;
    uint256 constant deltay2 = 691908006723662738185349232394170745088145781203809317088372634098997286056;

    
    uint256 constant IC0x = 5944982683046163940960693436641579710876124744688343881793529712277016488431;
    uint256 constant IC0y = 17489568496554667419999831665993722461069932360542494222421586552092614438205;
    
    uint256 constant IC1x = 10869741792133398935581492753295961519027796997703858200332556771393182180714;
    uint256 constant IC1y = 666475467275958398732963944780447698396848949859264524808603917077759603115;
    
    uint256 constant IC2x = 13552087577643529756196026330110569292242122254077952918691813918682521485;
    uint256 constant IC2y = 17879530028932478762990875730777516060225986006621889774914694194390304027629;
    
    uint256 constant IC3x = 13458948886235074577893210312898023664208591303516445006499479558628250949942;
    uint256 constant IC3y = 10127258287262119596635578849064096705801069712520121325475106363935135326985;
    
    uint256 constant IC4x = 2760984186847488901702586085456838679041326943948119704041850192529655640079;
    uint256 constant IC4y = 14923300767219000412383737546249235076988705635875463049374102206782279214033;
    
    uint256 constant IC5x = 12860209357024683758115475348032628017637728644496907120859105257568929556799;
    uint256 constant IC5y = 3160789035385483032769871691336114748388605345291916481009206213514844484948;
    
    uint256 constant IC6x = 13024436682182174185613220008714286168996724531900830556554384654827581851033;
    uint256 constant IC6y = 16448974855622065229545411723481312425011204998300316229562287416619095884506;
    
    uint256 constant IC7x = 8431066814065798478369210320204941427880852563845417158977948133028430486173;
    uint256 constant IC7y = 4911170176395637481389667797250509510407062828827591757664507996626375632747;
    
    uint256 constant IC8x = 6251814476470234171637196231030171414926717857156139083565557551511948202461;
    uint256 constant IC8y = 12488190708418581623019462422583241098610529044687696250118951041275587879102;
    
    uint256 constant IC9x = 1546680860414732405132067545512293427386936991937416145372516960223643296000;
    uint256 constant IC9y = 8163897080574168842623665057177973750741039575991525036628534593670118607282;
    
    uint256 constant IC10x = 3692882101884118548341389148199373215562691793944086376664362951683243985885;
    uint256 constant IC10y = 14675139842592897423424147077323149130702184155103286941998700414289416165279;
    
    uint256 constant IC11x = 9622379473584451207376076145166680839497104068619096542832294560509649024384;
    uint256 constant IC11y = 6731804120544756691825793154371077593604663966649199009364727866977468095866;
    
    uint256 constant IC12x = 9134702535346282064404039106109188607457797158029539442818280950353748959249;
    uint256 constant IC12y = 12614600006302844035357676396753772407998699979888182353527959612403753896004;
    
    uint256 constant IC13x = 1651633908091819381682926242357847119905455400600982512847919740928201258150;
    uint256 constant IC13y = 19668485774427799494807435384655374324977599230398935479602903146817029197587;
    
    uint256 constant IC14x = 19776756117140469520777054004637388676011701190756414974884376150239191134586;
    uint256 constant IC14y = 10829348291889292730914046226968413854895029320095100141036034326185302775386;
    
    uint256 constant IC15x = 11856208885849878903344236019024382430388641891014208276450541178657264286741;
    uint256 constant IC15y = 11772075931244737710226449542348053221000128083127409267403625350614870279778;
    
    uint256 constant IC16x = 20886387130907129396132142985195609254257553585337568598872743010741305611614;
    uint256 constant IC16y = 10495854272808293325257549883556355536236463765779153176003855024045740273253;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
